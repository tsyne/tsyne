/**
 * Battery Service
 *
 * Reads battery information from Linux sysfs (/sys/class/power_supply/).
 * Provides both real and mock implementations for testing.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BatteryInfo {
  /** Battery charge percentage (0-100) */
  percentage: number;
  /** Charging status: 'Charging', 'Discharging', 'Full', 'Not charging', 'Unknown' */
  status: string;
  /** Whether AC power is connected */
  acConnected: boolean;
  /** Battery health: 'Good', 'Overheat', 'Dead', 'Over voltage', 'Unknown' */
  health: string;
  /** Battery technology: 'Li-ion', 'Li-poly', etc. */
  technology: string;
  /** Current voltage in microvolts */
  voltageNow: number;
  /** Current current in microamps (positive = charging, negative = discharging) */
  currentNow: number;
  /** Battery temperature in tenths of degrees Celsius */
  temperature: number;
  /** Energy now in microwatt-hours */
  energyNow: number;
  /** Energy full in microwatt-hours */
  energyFull: number;
  /** Energy full design in microwatt-hours */
  energyFullDesign: number;
  /** Estimated time remaining in minutes (-1 if unknown) */
  timeRemaining: number;
  /** Power supply name (e.g., 'BAT0', 'battery') */
  name: string;
}

export interface IBatteryService {
  /** Get current battery information */
  getBatteryInfo(): Promise<BatteryInfo>;
  /** Check if battery is present */
  hasBattery(): Promise<boolean>;
  /** Get list of available power supplies */
  getPowerSupplies(): Promise<string[]>;
}

/**
 * Real battery service - reads from /sys/class/power_supply/
 */
export class LinuxBatteryService implements IBatteryService {
  private readonly sysPath = '/sys/class/power_supply';

  private async readSysFile(supply: string, file: string): Promise<string> {
    const filePath = path.join(this.sysPath, supply, file);
    try {
      return (await fs.promises.readFile(filePath, 'utf-8')).trim();
    } catch {
      return '';
    }
  }

  private async readSysNumber(supply: string, file: string): Promise<number> {
    const value = await this.readSysFile(supply, file);
    return value ? parseInt(value, 10) : 0;
  }

  async getPowerSupplies(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(this.sysPath);
      return entries;
    } catch {
      return [];
    }
  }

  async hasBattery(): Promise<boolean> {
    const supplies = await this.getPowerSupplies();
    for (const supply of supplies) {
      const type = await this.readSysFile(supply, 'type');
      if (type.toLowerCase() === 'battery') {
        const present = await this.readSysFile(supply, 'present');
        if (present === '1') return true;
      }
    }
    return false;
  }

  private async findBatterySupply(): Promise<string | null> {
    const supplies = await this.getPowerSupplies();
    for (const supply of supplies) {
      const type = await this.readSysFile(supply, 'type');
      if (type.toLowerCase() === 'battery') {
        return supply;
      }
    }
    return null;
  }

  private async isAcConnected(): Promise<boolean> {
    const supplies = await this.getPowerSupplies();
    for (const supply of supplies) {
      const type = await this.readSysFile(supply, 'type');
      if (type.toLowerCase() === 'mains') {
        const online = await this.readSysFile(supply, 'online');
        if (online === '1') return true;
      }
    }
    return false;
  }

  async getBatteryInfo(): Promise<BatteryInfo> {
    const battery = await this.findBatterySupply();
    if (!battery) {
      return this.getEmptyBatteryInfo();
    }

    const status = await this.readSysFile(battery, 'status') || 'Unknown';
    const health = await this.readSysFile(battery, 'health') || 'Unknown';
    const technology = await this.readSysFile(battery, 'technology') || 'Unknown';

    // Try capacity first (percentage), fall back to calculating from energy
    let percentage = await this.readSysNumber(battery, 'capacity');

    const energyNow = await this.readSysNumber(battery, 'energy_now');
    const energyFull = await this.readSysNumber(battery, 'energy_full');
    const energyFullDesign = await this.readSysNumber(battery, 'energy_full_design');

    // If capacity not available, calculate from energy
    if (!percentage && energyFull > 0) {
      percentage = Math.round((energyNow / energyFull) * 100);
    }

    // Try charge_now/charge_full if energy not available
    if (!energyNow) {
      const chargeNow = await this.readSysNumber(battery, 'charge_now');
      const chargeFull = await this.readSysNumber(battery, 'charge_full');
      if (!percentage && chargeFull > 0) {
        percentage = Math.round((chargeNow / chargeFull) * 100);
      }
    }

    const voltageNow = await this.readSysNumber(battery, 'voltage_now');
    const currentNow = await this.readSysNumber(battery, 'current_now');
    const temperature = await this.readSysNumber(battery, 'temp');

    // Estimate time remaining
    let timeRemaining = -1;
    if (currentNow > 0 && status === 'Discharging') {
      // current_now is in microamps, energy_now in microwatt-hours
      // time = energy / power, power = voltage * current
      const powerNow = (voltageNow / 1000000) * (currentNow / 1000000); // watts
      if (powerNow > 0) {
        timeRemaining = Math.round((energyNow / 1000000) / powerNow * 60); // minutes
      }
    }

    return {
      percentage: Math.min(100, Math.max(0, percentage)),
      status,
      acConnected: await this.isAcConnected(),
      health,
      technology,
      voltageNow,
      currentNow,
      temperature,
      energyNow,
      energyFull,
      energyFullDesign,
      timeRemaining,
      name: battery,
    };
  }

  private getEmptyBatteryInfo(): BatteryInfo {
    return {
      percentage: 0,
      status: 'Unknown',
      acConnected: false,
      health: 'Unknown',
      technology: 'Unknown',
      voltageNow: 0,
      currentNow: 0,
      temperature: 0,
      energyNow: 0,
      energyFull: 0,
      energyFullDesign: 0,
      timeRemaining: -1,
      name: '',
    };
  }
}

/**
 * Mock battery service for testing
 */
export class MockBatteryService implements IBatteryService {
  private info: BatteryInfo = {
    percentage: 75,
    status: 'Discharging',
    acConnected: false,
    health: 'Good',
    technology: 'Li-ion',
    voltageNow: 3850000, // 3.85V
    currentNow: 500000,  // 500mA
    temperature: 280,    // 28.0°C
    energyNow: 15000000, // 15Wh
    energyFull: 20000000, // 20Wh
    energyFullDesign: 22000000, // 22Wh
    timeRemaining: 180,  // 3 hours
    name: 'BAT0',
  };

  async getBatteryInfo(): Promise<BatteryInfo> {
    return { ...this.info };
  }

  async hasBattery(): Promise<boolean> {
    return true;
  }

  async getPowerSupplies(): Promise<string[]> {
    return ['BAT0', 'AC'];
  }

  /** Set mock battery state for testing */
  setMockState(partial: Partial<BatteryInfo>): void {
    this.info = { ...this.info, ...partial };
  }

  /** Simulate battery drain */
  simulateDrain(percentPerMinute: number = 1): void {
    this.info.percentage = Math.max(0, this.info.percentage - percentPerMinute);
    this.info.status = this.info.percentage > 0 ? 'Discharging' : 'Empty';
  }

  /** Simulate charging */
  simulateCharge(percentPerMinute: number = 2): void {
    this.info.acConnected = true;
    this.info.status = 'Charging';
    this.info.percentage = Math.min(100, this.info.percentage + percentPerMinute);
    if (this.info.percentage >= 100) {
      this.info.status = 'Full';
    }
  }
}
