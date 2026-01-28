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

import { ServiceResult } from '../../phone-apps/services';

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
  dial(number: string): Promise<ServiceResult<boolean>>;
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

  async dial(number: string): Promise<ServiceResult<boolean>> {
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

    return { available: true, value: true };
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
 * Stub implementation for machines without modem hardware.
 * Informs the user that the action would have placed a call if hardware were present.
 */
export class StubModemManagerService implements IModemManagerService {
  isModemAvailable(): boolean {
    return false;
  }

  async getModemInfo(): Promise<ModemInfo> {
    return {
      manufacturer: 'None',
      model: 'None',
      revision: '',
      serialNumber: '',
      imei: '',
      imsi: '',
      signalQuality: 0,
      registrationState: 'unknown',
    };
  }

  async dial(number: string): Promise<ServiceResult<boolean>> {
    return { 
      available: false, 
      reason: "The system would have placed a call to " + number + ", but there is no phone hardware on this machine." 
    };
  }

  async hangup(): Promise<void> {}

  async acceptCall(callId: string): Promise<boolean> {
    return false;
  }

  async rejectCall(callId: string): Promise<boolean> {
    return false;
  }

  getActiveCalls(): CallState[] {
    return [];
  }

  onCallStateChanged(callback: (calls: CallState[]) => void): () => void {
    return () => {};
  }

  async sendDTMF(tone: string): Promise<void> {}

  async getSignalQuality(): Promise<number> {
    return 0;
  }

  async getNetworkOperatorName(): Promise<string> {
    return 'No Hardware';
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

  async dial(number: string): Promise<ServiceResult<boolean>> {
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

      return { available: true, value: true };
    } catch (error) {
      console.error(`[ModemManager] Failed to dial: ${error}`);
      return { available: true, value: false };
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

// ============================================================================
// SMS Service Interface for ModemManager
// ============================================================================

export interface SMSMessage {
  path: string;           // DBus object path
  number: string;         // Phone number
  text: string;           // Message content
  timestamp: Date;
  state: 'received' | 'sent' | 'sending' | 'failed';
  direction: 'incoming' | 'outgoing';
}

export interface IModemManagerSMSService {
  // Initialization
  initialize(): Promise<void>;
  isAvailable(): boolean;

  // Send SMS
  sendSMS(number: string, text: string): Promise<boolean>;

  // Receive SMS
  getMessages(): Promise<SMSMessage[]>;
  deleteMessage(path: string): Promise<boolean>;

  // Listeners
  onMessageReceived(callback: (message: SMSMessage) => void): () => void;
}

// ============================================================================
// Real ModemManager SMS Service (PostmarketOS via D-Bus)
// ============================================================================

/**
 * Real SMS implementation using ModemManager D-Bus interface.
 *
 * Uses org.freedesktop.ModemManager1.Modem.Messaging interface:
 * - Methods: Create, Delete, List
 * - Signals: Added, Deleted
 *
 * Note: Requires 'dbus' npm package and ModemManager to be running.
 */
export class ModemManagerSMSService implements IModemManagerSMSService {
  private dbus: any;
  private modemPath: string | null = null;
  private messageListeners: Array<(message: SMSMessage) => void> = [];

  constructor(dbusModule?: any) {
    this.dbus = dbusModule || null;
  }

  async initialize(): Promise<void> {
    try {
      if (!this.dbus) {
        try {
          this.dbus = require('dbus');
        } catch {
          console.warn('[ModemManagerSMS] dbus module not available');
          return;
        }
      }

      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const mmObject = await mmService.getObject('/org/freedesktop/ModemManager1');

      // Find first modem with messaging capability
      const modems = await mmObject.ObjectManager.GetManagedObjects();
      for (const [path, interfaces] of Object.entries(modems) as [string, any][]) {
        if (interfaces['org.freedesktop.ModemManager1.Modem.Messaging']) {
          this.modemPath = path;
          console.log(`[ModemManagerSMS] Found messaging modem at ${path}`);
          break;
        }
      }

      if (this.modemPath) {
        await this.setupSignalListeners();
      }
    } catch (error) {
      console.error(`[ModemManagerSMS] Failed to initialize: ${error}`);
    }
  }

  isAvailable(): boolean {
    return this.modemPath !== null;
  }

  private async setupSignalListeners(): Promise<void> {
    // TODO: Listen for org.freedesktop.ModemManager1.Modem.Messaging.Added signal
    // When a new SMS arrives, parse it and notify listeners
    console.log('[ModemManagerSMS] TODO: Setup signal listeners for incoming SMS');
  }

  async sendSMS(number: string, text: string): Promise<boolean> {
    if (!this.modemPath) {
      console.error('[ModemManagerSMS] Modem not available');
      return false;
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const messaging = modemObject['org.freedesktop.ModemManager1.Modem.Messaging'];

      // Create SMS object with properties
      // See: https://www.freedesktop.org/software/ModemManager/doc/latest/ModemManager/gdbus-org.freedesktop.ModemManager1.Modem.Messaging.html
      const smsProperties = {
        'number': number,
        'text': text,
      };

      const smsPath = await messaging.Create(smsProperties);
      console.log(`[ModemManagerSMS] Created SMS at ${smsPath}`);

      // Get the SMS object and send it
      const smsObject = await mmService.getObject(smsPath);
      const sms = smsObject['org.freedesktop.ModemManager1.Sms'];
      await sms.Send();

      console.log(`[ModemManagerSMS] Sent SMS to ${number}`);
      return true;
    } catch (error) {
      console.error(`[ModemManagerSMS] Failed to send SMS: ${error}`);
      return false;
    }
  }

  async getMessages(): Promise<SMSMessage[]> {
    if (!this.modemPath) {
      return [];
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const messaging = modemObject['org.freedesktop.ModemManager1.Modem.Messaging'];

      const smsPaths: string[] = await messaging.List();
      const messages: SMSMessage[] = [];

      for (const smsPath of smsPaths) {
        try {
          const smsObject = await mmService.getObject(smsPath);
          const sms = smsObject['org.freedesktop.ModemManager1.Sms'];

          const number = await sms.Number;
          const text = await sms.Text;
          const timestamp = await sms.Timestamp;
          const state = await sms.State;
          const pduType = await sms.PduType;

          messages.push({
            path: smsPath,
            number,
            text,
            timestamp: new Date(timestamp),
            state: this.parseState(state),
            direction: pduType === 1 ? 'incoming' : 'outgoing',
          });
        } catch (err) {
          console.warn(`[ModemManagerSMS] Failed to read SMS at ${smsPath}: ${err}`);
        }
      }

      return messages;
    } catch (error) {
      console.error(`[ModemManagerSMS] Failed to list messages: ${error}`);
      return [];
    }
  }

  async deleteMessage(path: string): Promise<boolean> {
    if (!this.modemPath) {
      return false;
    }

    try {
      const bus = this.dbus.systemBus();
      const mmService = await bus.getService('org.freedesktop.ModemManager1');
      const modemObject = await mmService.getObject(this.modemPath);
      const messaging = modemObject['org.freedesktop.ModemManager1.Modem.Messaging'];

      await messaging.Delete(path);
      console.log(`[ModemManagerSMS] Deleted SMS at ${path}`);
      return true;
    } catch (error) {
      console.error(`[ModemManagerSMS] Failed to delete SMS: ${error}`);
      return false;
    }
  }

  onMessageReceived(callback: (message: SMSMessage) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      const idx = this.messageListeners.indexOf(callback);
      if (idx >= 0) this.messageListeners.splice(idx, 1);
    };
  }

  private notifyMessageReceived(message: SMSMessage): void {
    for (const listener of this.messageListeners) {
      listener(message);
    }
  }

  private parseState(state: number): 'received' | 'sent' | 'sending' | 'failed' {
    // ModemManager SMS state codes
    // MM_SMS_STATE_UNKNOWN = 0, STORED = 1, RECEIVING = 2, RECEIVED = 3,
    // SENDING = 4, SENT = 5
    switch (state) {
      case 3: return 'received';
      case 5: return 'sent';
      case 4: return 'sending';
      default: return 'received';
    }
  }
}
