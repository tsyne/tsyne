/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * ModemManager Service
 *
 * Provides D-Bus integration with ModemManager for cellular operations.
 * - Real implementation: Uses D-Bus to communicate with mm-ctl (ModemManager on postmarketOS)
 * - Mock implementation: Simulates ModemManager for testing and development
 *
 * ModemManager D-Bus API reference: https://www.freedesktop.org/wiki/Software/ModemManager/
 */

export interface CallState {
  id: string;
  number: string;
  state: 'idle' | 'ringing' | 'alerting' | 'connected' | 'disconnected';
  direction: 'incoming' | 'outgoing';
  startTime?: Date;
}

export interface ModemInfo {
  manufacturer: string;
  model: string;
  revision: string;
  serialNumber: string;
  imei: string;
  imsi: string;
  phoneNumber?: string;
  signalQuality: number; // 0-100
  registrationState: 'idle' | 'home' | 'searching' | 'denied' | 'unknown' | 'roaming';
}

export interface IModemManagerService {
  // Connection status
  isModemAvailable(): boolean;
  getModemInfo(): Promise<ModemInfo>;

  // Calling
  dial(number: string): Promise<boolean>;
  hangup(): Promise<void>;
  acceptCall(callId: string): Promise<boolean>;
  rejectCall(callId: string): Promise<boolean>;

  // Call state
  getActiveCalls(): CallState[];
  onCallStateChanged(callback: (calls: CallState[]) => void): () => void;

  // DTMF (tone dialing)
  sendDTMF(tone: string): Promise<void>;

  // Network
  getSignalQuality(): Promise<number>; // 0-100
  getNetworkOperatorName(): Promise<string>;
}

/**
 * Mock implementation for development and testing
 */
export class MockModemManagerService implements IModemManagerService {
  private modemAvailable = true;
  private activeCalls: CallState[] = [];
  private callStateListeners: Array<(calls: CallState[]) => void> = [];
  private nextCallId = 1;
  private callDurationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCallDurationUpdates();
  }

  isModemAvailable(): boolean {
    return this.modemAvailable;
  }

  async getModemInfo(): Promise<ModemInfo> {
    return {
      manufacturer: 'Mock Phone',
      model: 'Simulator 2024',
      revision: 'v1.0.0',
      serialNumber: 'MOCK-SN-12345',
      imei: '123456789012345',
      imsi: '310260123456789',
      phoneNumber: '+1-555-0000',
      signalQuality: Math.random() * 100,
      registrationState: 'home',
    };
  }

  async dial(number: string): Promise<boolean> {
    console.log(`[MockModemManager] Dialing ${number}`);

    const call: CallState = {
      id: `call-${this.nextCallId++}`,
      number,
      state: 'alerting',
      direction: 'outgoing',
      startTime: new Date(),
    };

    this.activeCalls.push(call);
    this.notifyCallStateChanged();

    // Simulate connection after 1 second
    setTimeout(() => {
      const idx = this.activeCalls.findIndex(c => c.id === call.id);
      if (idx >= 0) {
        this.activeCalls[idx].state = 'connected';
        this.notifyCallStateChanged();
      }
    }, 1000);

    return true;
  }

  async hangup(): Promise<void> {
    if (this.activeCalls.length === 0) return;

    console.log(`[MockModemManager] Hanging up all calls`);
    this.activeCalls = [];
    this.notifyCallStateChanged();
  }

  async acceptCall(callId: string): Promise<boolean> {
    const call = this.activeCalls.find(c => c.id === callId);
    if (!call) return false;

    console.log(`[MockModemManager] Accepting call ${callId}`);
    call.state = 'connected';
    call.startTime = new Date();
    this.notifyCallStateChanged();
    return true;
  }

  async rejectCall(callId: string): Promise<boolean> {
    const idx = this.activeCalls.findIndex(c => c.id === callId);
    if (idx < 0) return false;

    console.log(`[MockModemManager] Rejecting call ${callId}`);
    this.activeCalls.splice(idx, 1);
    this.notifyCallStateChanged();
    return true;
  }

  getActiveCalls(): CallState[] {
    return [...this.activeCalls];
  }

  onCallStateChanged(callback: (calls: CallState[]) => void): () => void {
    this.callStateListeners.push(callback);
    return () => {
      const idx = this.callStateListeners.indexOf(callback);
      if (idx >= 0) this.callStateListeners.splice(idx, 1);
    };
  }

  async sendDTMF(tone: string): Promise<void> {
    console.log(`[MockModemManager] Sending DTMF tone: ${tone}`);
  }

  async getSignalQuality(): Promise<number> {
    return Math.floor(Math.random() * 100);
  }

  async getNetworkOperatorName(): Promise<string> {
    return 'Mock Carrier';
  }

  private notifyCallStateChanged(): void {
    for (const listener of this.callStateListeners) {
      listener([...this.activeCalls]);
    }
  }

  private startCallDurationUpdates(): void {
    this.callDurationInterval = setInterval(() => {
      for (const call of this.activeCalls) {
        if (call.state === 'connected' && call.startTime) {
          // Update for UI that might show duration
        }
      }
    }, 1000);
  }

  destroy(): void {
    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
    }
  }
}

/**
 * Real ModemManager D-Bus implementation for postmarketOS
 *
 * Uses D-Bus to communicate with ModemManager daemon.
 * Note: Requires 'dbus' npm package and ModemManager to be running on the system.
 */
export class ModemManagerService implements IModemManagerService {
  private dbus: any; // Will be imported conditionally
  private modemPath: string | null = null;
  private activeCalls: CallState[] = [];
  private callStateListeners: Array<(calls: CallState[]) => void> = [];
  private nextCallId = 1;

  constructor(dbusModule?: any) {
    // Allow dependency injection for testing
    this.dbus = dbusModule || null;
  }

  isModemAvailable(): boolean {
    // Will be set after connecting to D-Bus
    return this.modemPath !== null;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.dbus) {
        // Lazy load dbus module
        try {
          this.dbus = require('dbus');
        } catch {
          console.warn('[ModemManager] dbus module not available, falling back to mock');
          return;
        }
      }

      // Connect to system D-Bus
      const bus = this.dbus.systemBus();

      // Get ModemManager service
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const mmObject = await mmService.getObject('/org/freedesktop/ModemManager1');

      // Get modems
      const modems = await mmObject.ObjectManager.GetManagedObjects();

      // Find first modem
      for (const [path, interfaces] of Object.entries(modems)) {
        if (interfaces['org.freedesktop.ModemManager1.Modem']) {
          this.modemPath = path;
          console.log(`[ModemManager] Found modem at ${path}`);
          break;
        }
      }

      if (this.modemPath) {
        this.setupSignalListeners();
      }
    } catch (error) {
      console.error(`[ModemManager] Failed to initialize: ${error}`);
    }
  }

  private setupSignalListeners(): void {
    // TODO: Implement D-Bus signal listening for call state changes
    // This would listen to org.freedesktop.ModemManager1.Call properties
  }

  async getModemInfo(): Promise<ModemInfo> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);

      const modem = modemObject['org.freedesktop.ModemManager1.Modem'];
      const modemSimple = modemObject['org.freedesktop.ModemManager1.Modem.Simple'];

      const manufacturer = await modem.Manufacturer;
      const model = await modem.Model;
      const revision = await modem.Revision;
      const serial = await modem.Serial;

      const status = await modemSimple.GetStatus();

      return {
        manufacturer,
        model,
        revision,
        serialNumber: serial,
        imei: status['sim-imei'] || 'N/A',
        imsi: status['sim-imsi'] || 'N/A',
        phoneNumber: status['phone-number'],
        signalQuality: status['signal-quality'] || 0,
        registrationState: this.parseRegistrationState(status['registration-state']),
      };
    } catch (error) {
      console.error(`[ModemManager] Failed to get modem info: ${error}`);
      throw error;
    }
  }

  async dial(number: string): Promise<boolean> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);

      const modemVoice = modemObject['org.freedesktop.ModemManager1.Modem.Voice'];

      const callPath = await modemVoice.CreateCall({
        number: number,
        direction: 1, // 1 = outgoing
      });

      console.log(`[ModemManager] Call created at ${callPath}`);

      const call: CallState = {
        id: `call-${this.nextCallId++}`,
        number,
        state: 'alerting',
        direction: 'outgoing',
        startTime: new Date(),
      };

      this.activeCalls.push(call);
      this.notifyCallStateChanged();

      // Start the call
      const callObject = await mmService.getObject(callPath);
      const callInterface = callObject['org.freedesktop.ModemManager1.Call'];
      await callInterface.Start();

      return true;
    } catch (error) {
      console.error(`[ModemManager] Failed to dial: ${error}`);
      return false;
    }
  }

  async hangup(): Promise<void> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const modemVoice = modemObject['org.freedesktop.ModemManager1.Modem.Voice'];

      for (const call of this.activeCalls) {
        if (call.state === 'connected' || call.state === 'alerting') {
          await modemVoice.HangupAll();
          console.log(`[ModemManager] Hung up call ${call.id}`);
        }
      }

      this.activeCalls = [];
      this.notifyCallStateChanged();
    } catch (error) {
      console.error(`[ModemManager] Failed to hangup: ${error}`);
    }
  }

  async acceptCall(callId: string): Promise<boolean> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');

      // Find call by ID and accept it
      const call = this.activeCalls.find(c => c.id === callId);
      if (!call) return false;

      // In ModemManager, calls are managed through the Modem.Voice interface
      // This is a simplified example
      call.state = 'connected';
      call.startTime = new Date();
      this.notifyCallStateChanged();

      return true;
    } catch (error) {
      console.error(`[ModemManager] Failed to accept call: ${error}`);
      return false;
    }
  }

  async rejectCall(callId: string): Promise<boolean> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const idx = this.activeCalls.findIndex(c => c.id === callId);
      if (idx < 0) return false;

      this.activeCalls.splice(idx, 1);
      this.notifyCallStateChanged();

      return true;
    } catch (error) {
      console.error(`[ModemManager] Failed to reject call: ${error}`);
      return false;
    }
  }

  getActiveCalls(): CallState[] {
    return [...this.activeCalls];
  }

  onCallStateChanged(callback: (calls: CallState[]) => void): () => void {
    this.callStateListeners.push(callback);
    return () => {
      const idx = this.callStateListeners.indexOf(callback);
      if (idx >= 0) this.callStateListeners.splice(idx, 1);
    };
  }

  async sendDTMF(tone: string): Promise<void> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const modemVoice = modemObject['org.freedesktop.ModemManager1.Modem.Voice'];

      await modemVoice.SendDtmf(tone);
      console.log(`[ModemManager] Sent DTMF: ${tone}`);
    } catch (error) {
      console.error(`[ModemManager] Failed to send DTMF: ${error}`);
    }
  }

  async getSignalQuality(): Promise<number> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const modem = modemObject['org.freedesktop.ModemManager1.Modem'];

      const signalQuality = await modem.SignalQuality;
      return signalQuality;
    } catch (error) {
      console.error(`[ModemManager] Failed to get signal quality: ${error}`);
      return 0;
    }
  }

  async getNetworkOperatorName(): Promise<string> {
    if (!this.modemPath) {
      throw new Error('Modem not available');
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const modem = modemObject['org.freedesktop.ModemManager1.Modem'];

      const operatorName = await modem.OperatorName;
      return operatorName || 'Unknown';
    } catch (error) {
      console.error(`[ModemManager] Failed to get operator name: ${error}`);
      return 'Unknown';
    }
  }

  private notifyCallStateChanged(): void {
    for (const listener of this.callStateListeners) {
      listener([...this.activeCalls]);
    }
  }

  private parseRegistrationState(state: number): 'idle' | 'home' | 'searching' | 'denied' | 'unknown' | 'roaming' {
    // ModemManager registration state codes
    switch (state) {
      case 0:
        return 'idle';
      case 1:
        return 'home';
      case 2:
        return 'searching';
      case 3:
        return 'denied';
      case 4:
        return 'unknown';
      case 5:
        return 'roaming';
      default:
        return 'unknown';
    }
  }
}
