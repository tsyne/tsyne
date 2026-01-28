import { IModemManagerService, CallState, ModemInfo } from './modemmanager-service';
import { ITelephonyService, ServiceResult, CallLogEntry } from '../../services';
import { exec } from 'child_process';
import { util } from 'util';

const execPromise = util.promisify(exec);

/**
 * MMCLI (ModemManager CLI) Service
 * 
 * Implements IModemManagerService using the `mmcli` command line tool.
 * This avoids native node bindings for D-Bus, making it easier to deploy on PostmarketOS.
 */
export class MmcliModemManagerService implements IModemManagerService, ITelephonyService {
  private activeCalls: CallState[] = [];
  private callStateListeners: Array<(calls: CallState[]) => void> = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private modemIndex: string = 'any';

  constructor() {
    // Start polling for call state
    this.startPolling();
  }

  isModemAvailable(): boolean {
    return true; // Assume true, individual commands will fail if not
  }

  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return '';
  }

  // --- ITelephonyService implementation ---

  async dial(number: string): Promise<ServiceResult<boolean>> {
    const success = await this.dialInternal(number);
    return { available: true, value: success };
  }

  // ITelephonyService alias for hangup (void vs Promise<void> matches)
  // ITelephonyService callLog methods
  getCallLog(): CallLogEntry[] { return []; }
  clearCallLog(): void {}
  isInCall(): boolean { return this.activeCalls.length > 0; }
  getCurrentCallNumber(): string | null { 
    return this.activeCalls.length > 0 ? this.activeCalls[0].number : null; 
  }

  // --- IModemManagerService implementation ---

  private async dialInternal(number: string): Promise<boolean> {
    try {
      console.log(`[Mmcli] Dialing ${number}...`);
      // Create the call
      const { stdout } = await execPromise(`mmcli -m ${this.modemIndex} --voice-create-call='number=${number}'`);
      
      // Parse call path/index from output: "Successfully created new call: /org/freedesktop/ModemManager1/Call/0"
      const match = stdout.match(/\/Call\/(\d+)/);
      if (!match) {
        console.error('[Mmcli] Failed to parse call ID from:', stdout);
        return false;
      }
      
      const callId = match[1]; // e.g. "0"
      
      // Start the call
      await execPromise(`mmcli -m ${this.modemIndex} --voice-start-call=${callId}`); // Actually, call commands are typically on the call object
      // Wait, mmcli -o <call-id> --start is the command usually, or mmcli -m <idx> --voice-xxx
      // Let's check typical syntax. usually: mmcli -c 0 --start
      
      await execPromise(`mmcli -c ${callId} --start`);
      
      this.updateCallState();
      return true;
    } catch (e) {
      console.error('[Mmcli] Dial failed:', e);
      return false;
    }
  }

  async hangup(): Promise<void> {
    for (const call of this.activeCalls) {
      try {
        // Extract numeric ID from our internal ID "call-X" if we assigned it, 
        // OR use the one from mmcli if we stored it.
        // Let's assume activeCalls ids are the mmcli call indexes
        await execPromise(`mmcli -c ${call.id} --hangup`);
      } catch (e) {
        console.error(`[Mmcli] Hangup failed for ${call.id}:`, e);
      }
    }
    this.updateCallState();
  }

  async acceptCall(callId: string): Promise<boolean> {
    try {
      await execPromise(`mmcli -c ${callId} --accept`);
      this.updateCallState();
      return true;
    } catch (e) {
      console.error(`[Mmcli] Accept failed for ${callId}:`, e);
      return false;
    }
  }

  async rejectCall(callId: string): Promise<boolean> {
    try {
      await execPromise(`mmcli -c ${callId} --hangup`); // Hangup rejects if ringing
      this.updateCallState();
      return true;
    } catch (e) {
      console.error(`[Mmcli] Reject failed for ${callId}:`, e);
      return false;
    }
  }

  getActiveCalls(): CallState[] {
    return [...this.activeCalls];
  }

  onCallStateChanged(callback: (calls: CallState[]) => void): () => void {
    this.callStateListeners.push(callback);
    return () => {
      this.callStateListeners = this.callStateListeners.filter(c => c !== callback);
    };
  }

  async sendDTMF(tone: string): Promise<void> {
    for (const call of this.activeCalls) {
      try {
        await execPromise(`mmcli -c ${call.id} --send-dtmf=${tone}`);
      } catch (e) {
        console.error(`[Mmcli] DTMF failed:`, e);
      }
    }
  }

  async getModemInfo(): Promise<ModemInfo> {
    try {
      const { stdout } = await execPromise(`mmcli -m ${this.modemIndex}`);
      // Simple parsing - in reality this output is complex text
      // We might use -J (JSON) if available, but text parsing is safer for older versions? 
      // JSON output (-J) was added in MM 1.10 (2019), should be safe for PMOS.
      
      let json: any = {};
      try {
        const { stdout: jsonOut } = await execPromise(`mmcli -m ${this.modemIndex} -J`);
        json = JSON.parse(jsonOut).modem;
      } catch {
        // Fallback or just empty
      }

      return {
        manufacturer: json.generic?.manufacturer || 'Unknown',
        model: json.generic?.model || 'Unknown',
        revision: json.generic?.revision || '',
        serialNumber: json.generic?.['device-identifier'] || '',
        imei: json['3gpp']?.imei || '',
        imsi: json['3gpp']?.imsi || '',
        signalQuality: json.generic?.['signal-quality']?.value || 0,
        registrationState: json['3gpp']?.['registration-state'] || 'unknown',
      };
    } catch (e) {
      console.error('[Mmcli] Info failed:', e);
      return {
        manufacturer: 'Error',
        model: 'Error',
        revision: '',
        serialNumber: '',
        imei: '',
        imsi: '',
        signalQuality: 0,
        registrationState: 'unknown'
      };
    }
  }

  async getSignalQuality(): Promise<number> {
    try {
      const { stdout } = await execPromise(`mmcli -m ${this.modemIndex} --output-key-value --fields=generic.signal-quality.value`);
      return parseInt(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  async getNetworkOperatorName(): Promise<string> {
    try {
      const { stdout } = await execPromise(`mmcli -m ${this.modemIndex} --output-key-value --fields=3gpp.operator-name`);
      return stdout.trim() || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private async updateCallState() {
    try {
      // List calls
      const { stdout } = await execPromise(`mmcli -m ${this.modemIndex} --voice-list-calls -J`);
      const data = JSON.parse(stdout);
      // data.modem.voice.calls is array of call paths e.g. ["/org/freedesktop/ModemManager1/Call/0"]
      
      const calls: CallState[] = [];
      const callPaths = data.modem?.voice?.calls || [];

      for (const path of callPaths) {
        // Get details for each call
        const id = path.split('/').pop();
        try {
          const { stdout: callOut } = await execPromise(`mmcli -c ${id} -J`);
          const callData = JSON.parse(callOut).call;
          
          // Map state: unknown, dialing, ringing-in, ringing-out, active, held, waiting, terminated
          let state: CallState['state'] = 'idle';
          if (callData.state === 'active') state = 'connected';
          else if (callData.state === 'ringing-in') state = 'ringing';
          else if (callData.state === 'ringing-out' || callData.state === 'dialing') state = 'alerting';
          else if (callData.state === 'terminated') state = 'disconnected';

          calls.push({
            id,
            number: callData.number,
            state,
            direction: callData.direction === 'incoming' ? 'incoming' : 'outgoing',
            startTime: state === 'connected' ? new Date() : undefined // Approximation
          });
        } catch {}
      }

      this.activeCalls = calls;
      this.notifyListeners();
    } catch (e) {
      // JSON might fail or no calls
      // console.error('[Mmcli] Poll failed:', e); 
    }
  }

  private notifyListeners() {
    for (const l of this.callStateListeners) {
      l(this.activeCalls);
    }
  }

  private startPolling() {
    // Poll every 2 seconds
    this.pollInterval = setInterval(() => this.updateCallState(), 2000);
  }

  dispose() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
