/**
 * Scales: D3-style data value transforms
 * Convert data ranges to visual ranges with various scale types
 */

export type ScaleType = 'linear' | 'log' | 'sqrt' | 'ordinal' | 'power';

export interface ScaleDomain {
  min: number;
  max: number;
}

export interface LinearScaleOptions {
  clamp?: boolean;  // Clamp output to range
}

export interface OrdinalScaleOptions {
  domain: (string | number)[];  // Discrete values
  padding?: number;  // Space around/between bands (0-1)
}

/**
 * Linear scale: y = a*x + b
 */
export class LinearScale {
  private domainMin: number = 0;
  private domainMax: number = 1;
  private rangeMin: number = 0;
  private rangeMax: number = 1;
  private clamp: boolean = false;

  domain(min: number, max: number): this {
    this.domainMin = min;
    this.domainMax = max;
    return this;
  }

  range(min: number, max: number): this {
    this.rangeMin = min;
    this.rangeMax = max;
    return this;
  }

  setClamp(clamp: boolean): this {
    this.clamp = clamp;
    return this;
  }

  scale(value: number): number {
    const t = (value - this.domainMin) / (this.domainMax - this.domainMin);
    let output = this.rangeMin + t * (this.rangeMax - this.rangeMin);
    if (this.clamp) {
      output = Math.max(this.rangeMin, Math.min(this.rangeMax, output));
    }
    return output;
  }

  invert(value: number): number {
    const t = (value - this.rangeMin) / (this.rangeMax - this.rangeMin);
    return this.domainMin + t * (this.domainMax - this.domainMin);
  }

  ticks(count: number = 5): number[] {
    const step = (this.domainMax - this.domainMin) / (count - 1);
    return Array.from({ length: count }, (_, i) => this.domainMin + i * step);
  }
}

/**
 * Logarithmic scale: y = a*log(x) + b
 */
export class LogScale {
  private domainMin: number = 1;
  private domainMax: number = 100;
  private rangeMin: number = 0;
  private rangeMax: number = 1;
  private clamp: boolean = false;
  private base: number = 10;

  domain(min: number, max: number): this {
    if (min <= 0 || max <= 0) {
      throw new Error('Log scale domain must be positive');
    }
    this.domainMin = min;
    this.domainMax = max;
    return this;
  }

  range(min: number, max: number): this {
    this.rangeMin = min;
    this.rangeMax = max;
    return this;
  }

  setClamp(clamp: boolean): this {
    this.clamp = clamp;
    return this;
  }

  setBase(base: number): this {
    this.base = base;
    return this;
  }

  scale(value: number): number {
    if (value <= 0) return this.rangeMin;
    const logMin = Math.log(this.domainMin) / Math.log(this.base);
    const logMax = Math.log(this.domainMax) / Math.log(this.base);
    const logValue = Math.log(value) / Math.log(this.base);
    const t = (logValue - logMin) / (logMax - logMin);
    let output = this.rangeMin + t * (this.rangeMax - this.rangeMin);
    if (this.clamp) {
      output = Math.max(this.rangeMin, Math.min(this.rangeMax, output));
    }
    return output;
  }

  invert(value: number): number {
    const t = (value - this.rangeMin) / (this.rangeMax - this.rangeMin);
    const logMin = Math.log(this.domainMin) / Math.log(this.base);
    const logMax = Math.log(this.domainMax) / Math.log(this.base);
    const logValue = logMin + t * (logMax - logMin);
    return Math.pow(this.base, logValue);
  }

  ticks(count: number = 5): number[] {
    const logMin = Math.log(this.domainMin) / Math.log(this.base);
    const logMax = Math.log(this.domainMax) / Math.log(this.base);
    const step = (logMax - logMin) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      return Math.pow(this.base, logMin + i * step);
    });
  }
}

/**
 * Square root scale: y = a*sqrt(x) + b
 */
export class SqrtScale {
  private domainMin: number = 0;
  private domainMax: number = 1;
  private rangeMin: number = 0;
  private rangeMax: number = 1;
  private clamp: boolean = false;

  domain(min: number, max: number): this {
    if (min < 0 || max < 0) {
      throw new Error('Sqrt scale domain must be non-negative');
    }
    this.domainMin = min;
    this.domainMax = max;
    return this;
  }

  range(min: number, max: number): this {
    this.rangeMin = min;
    this.rangeMax = max;
    return this;
  }

  setClamp(clamp: boolean): this {
    this.clamp = clamp;
    return this;
  }

  scale(value: number): number {
    if (value < 0) return this.rangeMin;
    const sqrtMin = Math.sqrt(this.domainMin);
    const sqrtMax = Math.sqrt(this.domainMax);
    const sqrtValue = Math.sqrt(value);
    const t = (sqrtValue - sqrtMin) / (sqrtMax - sqrtMin);
    let output = this.rangeMin + t * (this.rangeMax - this.rangeMin);
    if (this.clamp) {
      output = Math.max(this.rangeMin, Math.min(this.rangeMax, output));
    }
    return output;
  }

  invert(value: number): number {
    const t = (value - this.rangeMin) / (this.rangeMax - this.rangeMin);
    const sqrtMin = Math.sqrt(this.domainMin);
    const sqrtMax = Math.sqrt(this.domainMax);
    const sqrtValue = sqrtMin + t * (sqrtMax - sqrtMin);
    return sqrtValue * sqrtValue;
  }

  ticks(count: number = 5): number[] {
    const step = (this.domainMax - this.domainMin) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      return this.domainMin + i * step;
    });
  }
}

/**
 * Power scale: y = a*(x^n) + b
 */
export class PowerScale {
  private domainMin: number = 0;
  private domainMax: number = 1;
  private rangeMin: number = 0;
  private rangeMax: number = 1;
  private clamp: boolean = false;
  private exponent: number = 2;

  domain(min: number, max: number): this {
    this.domainMin = min;
    this.domainMax = max;
    return this;
  }

  range(min: number, max: number): this {
    this.rangeMin = min;
    this.rangeMax = max;
    return this;
  }

  setClamp(clamp: boolean): this {
    this.clamp = clamp;
    return this;
  }

  setExponent(exponent: number): this {
    this.exponent = exponent;
    return this;
  }

  scale(value: number): number {
    const t = (value - this.domainMin) / (this.domainMax - this.domainMin);
    const scaledT = Math.pow(t, this.exponent);
    let output = this.rangeMin + scaledT * (this.rangeMax - this.rangeMin);
    if (this.clamp) {
      output = Math.max(this.rangeMin, Math.min(this.rangeMax, output));
    }
    return output;
  }

  invert(value: number): number {
    const t = (value - this.rangeMin) / (this.rangeMax - this.rangeMin);
    const invT = Math.pow(t, 1 / this.exponent);
    return this.domainMin + invT * (this.domainMax - this.domainMin);
  }

  ticks(count: number = 5): number[] {
    const step = (this.domainMax - this.domainMin) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      return this.domainMin + i * step;
    });
  }
}

/**
 * Ordinal scale: maps discrete values to ranges
 */
export class OrdinalScale {
  private domain: (string | number)[] = [];
  private rangeMin: number = 0;
  private rangeMax: number = 1;
  private padding: number = 0.1;

  setDomain(domain: (string | number)[]): this {
    this.domain = [...domain];
    return this;
  }

  range(min: number, max: number): this {
    this.rangeMin = min;
    this.rangeMax = max;
    return this;
  }

  setPadding(padding: number): this {
    this.padding = Math.max(0, Math.min(1, padding));
    return this;
  }

  scale(value: string | number): number {
    const index = this.domain.indexOf(value);
    if (index === -1) return this.rangeMin;

    const n = this.domain.length;
    const rangeBandwidth = (this.rangeMax - this.rangeMin) / n;
    const paddingAmount = rangeBandwidth * this.padding;
    const bandWidth = rangeBandwidth - paddingAmount;

    return this.rangeMin + index * rangeBandwidth + paddingAmount / 2;
  }

  bandwidth(): number {
    const n = this.domain.length;
    const rangeBandwidth = (this.rangeMax - this.rangeMin) / n;
    const paddingAmount = rangeBandwidth * this.padding;
    return rangeBandwidth - paddingAmount;
  }

  ticks(): (string | number)[] {
    return [...this.domain];
  }
}

/**
 * Factory function for creating scales
 */
export function scale(type: 'linear'): LinearScale;
export function scale(type: 'log'): LogScale;
export function scale(type: 'sqrt'): SqrtScale;
export function scale(type: 'power'): PowerScale;
export function scale(type: 'ordinal'): OrdinalScale;
export function scale(type: ScaleType): LinearScale | LogScale | SqrtScale | PowerScale | OrdinalScale {
  switch (type) {
    case 'linear':
      return new LinearScale();
    case 'log':
      return new LogScale();
    case 'sqrt':
      return new SqrtScale();
    case 'power':
      return new PowerScale();
    case 'ordinal':
      return new OrdinalScale();
    default:
      return new LinearScale();
  }
}
