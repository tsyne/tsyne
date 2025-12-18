<!--
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
 -->

# Phone Dialer App

A phone dialer for Tsyne on postmarketOS with numeric keypad, call management, and ModemManager integration.

## Features

### Numeric Keypad
- Standard 12-key phone keypad (0-9, *, #)
- Large touch-friendly buttons
- Real-time digit display
- Backspace/delete functionality
- Clear all function

### Call Management
- Start/end calls
- Caller ID display during active calls
- Call duration tracking
- Call state indicators (idle, ringing, active, ended)
- Recent call logging

### Contact Integration
- Contact lookup by phone number
- Display contact name during calls
- Quick access to contacts
- Caller ID resolution

### ModemManager Integration
- D-Bus integration with ModemManager
- Real cellular operations on postmarketOS
- Call state management
- DTMF support (for phone menus)

## Architecture

### Services (modemmanager-service.ts)

**IModemManagerService Interface** - Abstract modem operations:
```typescript
// Call control
startCall(number: string): Promise<boolean>
endCall(): Promise<boolean>
hangupCall(callId: string): Promise<boolean>

// State queries
getCallState(): CallState | null
isCallActive(): boolean
getActiveCalls(): CallState[]

// DTMF (tone dialing)
sendDTMF(tone: string): Promise<boolean>

// Modem info
getModemInfo(): ModemInfo | null
isModemAvailable(): boolean

// Event listeners
onCallStateChanged(callback): () => void
onCallRinging(callback): () => void
onCallAnswered(callback): () => void
onCallEnded(callback): () => void
```

**MockModemManagerService** - Complete mock implementation:
- Simulates call state transitions
- Mock contact lookup
- Call duration tracking
- Event listener support
- No actual hardware required for testing

### UI (dialer.ts)

Pseudo-declarative pattern matching all other Tsyne apps:
- Instance-local state management
- Real-time UI updates via service listeners
- Automatic event listener cleanup
- Single `createDialerApp()` builder function
- Dynamic keypad layout
- Call state indicators

## Sample Contacts

Built-in contact list for caller ID:
- Alice Smith: 555-0100
- Bob Johnson: 555-0101
- Charlie Brown: 555-0102
- Diana Prince: 555-0103
- Eve Wilson: 555-0104
- Frank Miller: 555-0105

## Testing

### UI Tests (TsyneTest)
```bash
npm test -- dialer.test.ts
TSYNE_HEADED=1 npm test -- dialer.test.ts  # With GUI
TAKE_SCREENSHOTS=1 npm test -- dialer.test.ts  # With screenshots
```

### Unit Tests (Jest)
```bash
npm test -- dialer.test.ts
```

Tests cover:
- Keypad digit input
- Number display
- Backspace/delete functionality
- Clear functionality
- Call initiation
- Call termination
- Caller ID lookup
- Call state tracking
- Contact integration
- Event listener notifications

## Usage

### Standalone
```bash
npx tsx phone-apps/dialer/dialer.ts
```

### In Phone Simulator
```bash
npx tsx phone-apps/phone-modem-simulator.ts
# Click Phone icon to launch
```

### Desktop Integration
```typescript
import { createDialerApp } from './phone-apps/dialer/dialer';
import { MockModemManagerService } from './phone-apps/dialer/modemmanager-service';
import { MockContactsService } from './phone-apps/contacts/contacts-service';

app({ title: 'Phone' }, async (a) => {
  const modem = new MockModemManagerService();
  const contacts = new MockContactsService();
  await modem.initialize();
  createDialerApp(a, modem, contacts);
});
```

## ModemManager D-Bus Integration

### Real Implementation (postmarketOS)
The real implementation communicates with ModemManager via D-Bus:

```
org.freedesktop.ModemManager1
├── /org/freedesktop/ModemManager1/Modem/0
│   ├── Org.freedesktop.ModemManager1.Modem
│   ├── Org.freedesktop.ModemManager1.Modem.Modem3gpp
│   ├── Org.freedesktop.ModemManager1.Modem.ModemCdma
│   └── Org.freedesktop.ModemManager1.Call
```

Features available:
- Call creation and termination
- Call state tracking
- DTMF tone support
- Modem capabilities
- Signal strength

### Mock Implementation (Development)
For development and testing:
- No hardware required
- Simulated call state machine
- Realistic timing and delays
- Full feature support
- Contact lookup simulation

## Call State Machine

```
idle
  ├──startCall()──> ringing
                      ├──hangup()──> ended
                      └──(auto-answer)──> active

active
  ├──endCall()──> idle
  └──hangup()──> idle

ringing (inbound)
  ├──answer()──> active
  └──hangup()──> idle
```

## Future Enhancements

- Call history with filtering
- Speed dial (0-9 key long-press)
- Voicemail support
- Call recording
- Conference calling
- Call forwarding
- Do Not Disturb mode
- Vibration feedback
- Custom ringtones
- Call waiting
- Call transfer
- Emergency services (911)
- SIM card management
- Airplane mode
- Network operator display
- Signal strength indicator
- Dual SIM support

## Implementation Details

### Real Phone Activation
To enable real cellular calls:
1. Device must have ModemManager running
2. D-Bus access required
3. Modem must be initialized
4. Network registration required
5. Phone number must be valid for network

### ModemManager Commands
```bash
# Check modem status
mmcli -m 0

# Create a call
mmcli -m 0 --create-call number=5550100

# Hangup a call
mmcli -m 0 --call=<id> --hangup
```

## Files

- `dialer.ts` - Main app UI
- `modemmanager-service.ts` - ModemManager service interface and mock implementation
- `dialer.test.ts` - Comprehensive tests
- `README.md` - This file
