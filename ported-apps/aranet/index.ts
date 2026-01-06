/**
 * Aranet4 Air Quality Monitor - Tsyne Port
 *
 * @tsyne-app:name Aranet4 Monitor
 * @tsyne-app:icon confirm
 * @tsyne-app:category Utilities
 * @tsyne-app:args (a: App) => void
 *
 * A real-time air quality monitor for Aranet4 sensors with Bluetooth connectivity.
 * Displays CO2, temperature, humidity, pressure, and battery level.
 * Features color-coded alerts, customizable audio alarms, and settings management.
 *
 * Portions Copyright (c) 2026 Aranet4MenuBar Contributors
 * Portions Copyright Paul Hammant 2026
 */

// ============================================================================
// DATA MODELS & TYPES
// ============================================================================

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Scanning = 'scanning',
  Connecting = 'connecting',
  Connected = 'connected',
}

export enum CO2Level {
  Good = 'good',      // < 800 ppm
  Moderate = 'moderate',  // 800-1199 ppm
  Poor = 'poor',      // >= 1200 ppm
}

export enum AlertSoundType {
  Off = 'Off',
  Gentle = 'Gentle',
  Urgent = 'Urgent (Fire Alarm)',
}

export interface Aranet4Reading {
  co2: number;         // ppm
  temperature: number; // Celsius
  pressure: number;    // hPa
  humidity: number;    // percent
  battery: number;     // percent
  timestamp: Date;
}

export interface AppSettings {
  alertSound: AlertSoundType;
  autoConnect: boolean;
  refreshInterval: number; // minutes
}

export interface Aranet4Device {
  id: string;
  name: string;
  location?: string;
  discovered: Date;
}

// ============================================================================
// ARANET STORE (Observable Pattern)
// ============================================================================

type ChangeListener = () => void;

export class AranetStore {
  private connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;
  private lastReading: Aranet4Reading | null = null;
  private settings: AppSettings = {
    alertSound: AlertSoundType.Gentle,
    autoConnect: true,
    refreshInterval: 5,
  };
  private changeListeners: ChangeListener[] = [];
  private nextReadingId = 0;
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private availableDevices: Aranet4Device[] = [];
  private selectedDeviceId: string | null = null;

  // Subscribe to store changes
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    // Call listener immediately to initialize UI
    listener();
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  // ========== Device Discovery ==========
  async discoverDevices(): Promise<void> {
    // Simulate device discovery
    const devices: Aranet4Device[] = [
      { id: 'aranet-001', name: 'Living Room', location: 'Living Room', discovered: new Date() },
      { id: 'aranet-002', name: 'Bedroom', location: 'Bedroom', discovered: new Date() },
      { id: 'aranet-003', name: 'Office', location: 'Office', discovered: new Date() },
    ];
    this.availableDevices = devices;
    // Auto-select first device if none selected
    if (!this.selectedDeviceId && devices.length > 0) {
      this.selectedDeviceId = devices[0].id;
    }
    this.notifyChange();
  }

  getAvailableDevices(): Aranet4Device[] {
    return [...this.availableDevices];
  }

  getSelectedDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  getSelectedDeviceName(): string {
    if (!this.selectedDeviceId) return 'No Device Selected';
    const device = this.availableDevices.find(d => d.id === this.selectedDeviceId);
    return device ? device.name : 'Unknown Device';
  }

  selectDevice(deviceId: string): void {
    const device = this.availableDevices.find(d => d.id === deviceId);
    if (device) {
      this.selectedDeviceId = deviceId;
      // Disconnect from current device if connected
      if (this.connectionStatus !== ConnectionStatus.Disconnected) {
        this.disconnect();
      }
      this.notifyChange();
    }
  }

  // ========== Connection Status ==========
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async connect(): Promise<void> {
    this.connectionStatus = ConnectionStatus.Scanning;
    this.notifyChange();

    // Simulate scanning delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.connectionStatus = ConnectionStatus.Connecting;
    this.notifyChange();

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    this.connectionStatus = ConnectionStatus.Connected;
    this.notifyChange();

    // Start auto-refresh
    this.startAutoRefresh();

    // Get initial reading
    await this.refreshReading();
  }

  async disconnect(): Promise<void> {
    this.connectionStatus = ConnectionStatus.Disconnected;
    this.lastReading = null;
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    this.notifyChange();
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }

    const intervalMs = this.settings.refreshInterval * 60 * 1000;
    this.autoRefreshTimer = setInterval(() => {
      this.refreshReading();
    }, intervalMs);
  }

  // ========== Readings ==========
  getLastReading(): Aranet4Reading | null {
    return this.lastReading;
  }

  async refreshReading(): Promise<void> {
    if (this.connectionStatus !== ConnectionStatus.Connected) {
      return;
    }

    // Simulate Aranet4 data with realistic variations
    // In a real implementation, this would read from Bluetooth
    const baseTemp = 22 + Math.sin(Date.now() / 60000) * 2;
    const baseCO2 = 600 + Math.sin(Date.now() / 30000 + Math.PI) * 300 + Math.random() * 100;

    this.lastReading = {
      co2: Math.round(baseCO2),
      temperature: Math.round(baseTemp * 10) / 10,
      pressure: 1013 + Math.random() * 20,
      humidity: 40 + Math.floor(Math.random() * 30),
      battery: Math.max(10, 100 - this.nextReadingId * 2),
      timestamp: new Date(),
    };

    this.nextReadingId++;

    // Trigger alarm if CO2 is poor
    if (this.getCO2Level() === CO2Level.Poor && this.settings.alertSound !== AlertSoundType.Off) {
      this.playAlert();
    }

    this.notifyChange();
  }

  // ========== CO2 Status ==========
  getCO2Level(): CO2Level {
    if (!this.lastReading) {
      return CO2Level.Good;
    }

    if (this.lastReading.co2 < 800) {
      return CO2Level.Good;
    } else if (this.lastReading.co2 < 1200) {
      return CO2Level.Moderate;
    } else {
      return CO2Level.Poor;
    }
  }

  getCO2LevelColor(): string {
    switch (this.getCO2Level()) {
      case CO2Level.Good:
        return '#4CAF50'; // Green
      case CO2Level.Moderate:
        return '#FFC107'; // Yellow
      case CO2Level.Poor:
        return '#F44336'; // Red
    }
  }

  getCO2LevelIcon(): string {
    switch (this.getCO2Level()) {
      case CO2Level.Good:
        return '🟢';
      case CO2Level.Moderate:
        return '🟡';
      case CO2Level.Poor:
        return '🔴';
    }
  }

  // ========== Settings ==========
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateAlertSound(sound: AlertSoundType): void {
    this.settings.alertSound = sound;
    this.notifyChange();
  }

  updateAutoConnect(enabled: boolean): void {
    this.settings.autoConnect = enabled;
    this.notifyChange();
  }

  updateRefreshInterval(minutes: number): void {
    this.settings.refreshInterval = Math.max(1, minutes);
    if (this.connectionStatus === ConnectionStatus.Connected) {
      this.startAutoRefresh();
    }
    this.notifyChange();
  }

  private playAlert(): void {
    // In a real app, this would play actual audio
    // For now, it's just a placeholder
    console.log(`Alert: CO2 is ${this.lastReading?.co2} ppm - ${this.settings.alertSound}`);
  }

  // Cleanup
  destroy(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
    this.changeListeners = [];
  }
}

// ============================================================================
// UI BUILDER
// ============================================================================

export function buildAranetApp(a: any): void {
  const store = new AranetStore();
  let mainWindow: any;
  let settingsWindow: any;
  let statusLabel: any;
  let co2Label: any;
  let tempLabel: any;
  let humidityLabel: any;
  let pressureLabel: any;
  let batteryLabel: any;
  let connectionLabel: any;
  let refreshButton: any;
  let settingsButton: any;

  // Subscribe to store changes and update UI
  store.subscribe(async () => {
    updateStatusDisplay();
    await updateReadingsDisplay();
  });

  function getStatusText(): string {
    const status = store.getConnectionStatus();
    switch (status) {
      case ConnectionStatus.Disconnected:
        return 'Disconnected';
      case ConnectionStatus.Scanning:
        return 'Scanning...';
      case ConnectionStatus.Connecting:
        return 'Connecting...';
      case ConnectionStatus.Connected:
        return 'Connected';
    }
  }

  function updateStatusDisplay(): void {
    if (connectionLabel) {
      connectionLabel.setText(`Status: ${getStatusText()}`);
    }

    const isConnected = store.getConnectionStatus() === ConnectionStatus.Connected;
    if (refreshButton) {
      refreshButton.when(() => isConnected);
    }
    if (statusLabel) {
      statusLabel.setText(store.getConnectionStatus() === ConnectionStatus.Connected ? 'Connected to Aranet4' : 'Not Connected');
    }
  }

  async function updateReadingsDisplay(): Promise<void> {
    const reading = store.getLastReading();
    if (reading) {
      if (co2Label) {
        co2Label.setText(`CO2: ${reading.co2} ppm`);
      }
      if (tempLabel) {
        tempLabel.setText(`Temperature: ${reading.temperature.toFixed(1)}°C`);
      }
      if (humidityLabel) {
        humidityLabel.setText(`Humidity: ${reading.humidity}%`);
      }
      if (pressureLabel) {
        pressureLabel.setText(`Pressure: ${reading.pressure.toFixed(1)} hPa`);
      }
      if (batteryLabel) {
        batteryLabel.setText(`Battery: ${reading.battery}%`);
      }
    }
  }

  // Main window
  a.window({ title: 'Aranet4 Monitor', width: 500, height: 550 }, (win: any) => {
    mainWindow = win;

    win.setContent(() => {
      a.vbox(() => {
        // Device selector
        a.hbox(() => {
          a.label('Device:').withId('deviceLabel');
          a.vbox(() => {
            // Device dropdown - create buttons for each available device
            a.hbox(() => {
              store.getAvailableDevices().forEach((device) => {
                a.button(device.name)
                  .onClick(() => {
                    store.selectDevice(device.id);
                  })
                  .when(() => store.getSelectedDeviceId() !== device.id)
                  .withId(`device-btn-${device.id}`);

                a.label('✓')
                  .withId(`device-selected-${device.id}`)
                  .when(() => store.getSelectedDeviceId() === device.id);
              });
            });
          });
        });

        a.separator();

        // Header with status icon and connection info
        a.hbox(() => {
          a.label(store.getCO2LevelIcon()).withId('statusIcon');
          a.vbox(() => {
            statusLabel = a.label('Not Connected').withId('statusLabel');
            connectionLabel = a.label('Status: Disconnected').withId('connectionStatus');
          });
        });

        a.separator();

        // Main readings display
        a.vbox(() => {
          co2Label = a.label('CO2: -- ppm').withId('co2Level');
          tempLabel = a.label('Temperature: --°C').withId('temperature');
          humidityLabel = a.label('Humidity: --%').withId('humidity');
          pressureLabel = a.label('Pressure: -- hPa').withId('pressure');
          batteryLabel = a.label('Battery: --%').withId('battery');
        });

        a.separator();

        // Control buttons
        a.hbox(() => {
          a.button('Connect')
            .onClick(async () => {
              await store.connect();
            })
            .when(() => store.getConnectionStatus() === ConnectionStatus.Disconnected)
            .withId('connectBtn');

          a.button('Disconnect')
            .onClick(async () => {
              await store.disconnect();
            })
            .when(() => store.getConnectionStatus() !== ConnectionStatus.Disconnected)
            .withId('disconnectBtn');

          refreshButton = a.button('Refresh')
            .onClick(async () => {
              await store.refreshReading();
            })
            .when(() => store.getConnectionStatus() === ConnectionStatus.Connected)
            .withId('refreshBtn');

          settingsButton = a.button('Settings').onClick(() => {
            showSettingsWindow();
          }).withId('settingsBtn');
        });
      });
    });

    // Discover available devices on startup
    (async () => {
      await store.discoverDevices();
    })();

    win.show();
  });

  function showSettingsWindow(): void {
    if (settingsWindow) {
      return; // Already open
    }

    a.window({ title: 'Aranet4 Settings', width: 400, height: 350 }, (win: any) => {
      settingsWindow = win;

      const onClose = () => {
        settingsWindow = null;
      };

      win.setCloseIntercept(async () => {
        onClose();
        return true;
      });

      win.setContent(() => {
        a.vbox(() => {
          a.label('Settings').withId('settingsTitle');

          a.separator();

          // Alert Sound Setting
          a.label('Alert Sound:').withId('alertSoundLabel');
          a.hbox(() => {
            for (const soundType of [AlertSoundType.Off, AlertSoundType.Gentle, AlertSoundType.Urgent]) {
              a.button(soundType)
                .onClick(() => {
                  store.updateAlertSound(soundType);
                })
                .when(() => store.getSettings().alertSound !== soundType)
                .withId(`sound-${soundType}`);

              a.label('✓')
                .withId(`soundSelected-${soundType}`)
                .when(() => store.getSettings().alertSound === soundType);
            }
          });

          a.separator();

          // Auto-Connect Setting
          a.label('Auto-Connect:').withId('autoConnectLabel');
          a.checkbox('Enable auto-connect')
            .onChange((checked: boolean) => {
              store.updateAutoConnect(checked);
            })
            .when(() => true)
            .withId('autoConnectCheckbox');

          a.separator();

          // Refresh Interval Setting
          a.label('Refresh Interval (minutes):').withId('refreshIntervalLabel');
          a.hbox(() => {
            a.button('-')
              .onClick(() => {
                const current = store.getSettings().refreshInterval;
                store.updateRefreshInterval(current - 1);
              })
              .withId('decreaseInterval');

            a.label(store.getSettings().refreshInterval.toString())
              .withId('intervalValue');

            a.button('+')
              .onClick(() => {
                const current = store.getSettings().refreshInterval;
                store.updateRefreshInterval(current + 1);
              })
              .withId('increaseInterval');
          });

          a.separator();

          // Close button
          a.button('Close')
            .onClick(() => {
              win.close();
              onClose();
            })
            .withId('closeSettingsBtn');
        });
      });

      win.show();
    });
  }
}

export default buildAranetApp;
