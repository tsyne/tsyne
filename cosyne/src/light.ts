/**
 * Lighting system for Cosyne 3D
 *
 * Provides different light types: directional, point, ambient, spot
 */

import { Vector3 } from './math3d';
import { parseColor, ColorRGBA } from './material';

/**
 * Light types supported by Cosyne 3D
 */
export type LightType = 'directional' | 'point' | 'ambient' | 'spot';

/**
 * Base light options
 */
export interface BaseLightOptions {
  /** Light type */
  type: LightType;
  /** Light color (hex or named) */
  color?: string;
  /** Light intensity (0-1+) */
  intensity?: number;
  /** Whether the light is enabled */
  enabled?: boolean;
  /** Cast shadows (for shadow-capable lights) */
  castShadow?: boolean;
}

/**
 * Directional light options (like the sun)
 */
export interface DirectionalLightOptions extends BaseLightOptions {
  type: 'directional';
  /** Direction the light is pointing (normalized) */
  direction?: [number, number, number];
}

/**
 * Point light options (like a light bulb)
 */
export interface PointLightOptions extends BaseLightOptions {
  type: 'point';
  /** Position of the light */
  position?: [number, number, number];
  /** Maximum range of the light (0 = infinite) */
  range?: number;
  /** Decay rate (how quickly light diminishes with distance) */
  decay?: number;
}

/**
 * Ambient light options (everywhere equally)
 */
export interface AmbientLightOptions extends BaseLightOptions {
  type: 'ambient';
}

/**
 * Spot light options (like a flashlight)
 */
export interface SpotLightOptions extends BaseLightOptions {
  type: 'spot';
  /** Position of the light */
  position?: [number, number, number];
  /** Direction the light is pointing */
  direction?: [number, number, number];
  /** Inner cone angle in radians */
  innerAngle?: number;
  /** Outer cone angle in radians */
  outerAngle?: number;
  /** Maximum range of the light */
  range?: number;
  /** Decay rate */
  decay?: number;
}

/**
 * Union of all light options
 */
export type LightOptions =
  | DirectionalLightOptions
  | PointLightOptions
  | AmbientLightOptions
  | SpotLightOptions;

/**
 * Base light class
 */
export abstract class Light {
  protected _color: string = '#ffffff';
  protected _intensity: number = 1.0;
  protected _enabled: boolean = true;
  protected _castShadow: boolean = false;
  protected _parsedColor: ColorRGBA | null = null;

  constructor(options?: BaseLightOptions) {
    if (options) {
      if (options.color !== undefined) this._color = options.color;
      if (options.intensity !== undefined) this._intensity = options.intensity;
      if (options.enabled !== undefined) this._enabled = options.enabled;
      if (options.castShadow !== undefined) this._castShadow = options.castShadow;
    }
  }

  abstract get type(): LightType;

  get color(): string {
    return this._color;
  }

  set color(value: string) {
    this._color = value;
    this._parsedColor = null;
  }

  get intensity(): number {
    return this._intensity;
  }

  set intensity(value: number) {
    this._intensity = Math.max(0, value);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  get castShadow(): boolean {
    return this._castShadow;
  }

  set castShadow(value: boolean) {
    this._castShadow = value;
  }

  getParsedColor(): ColorRGBA {
    if (!this._parsedColor) {
      this._parsedColor = parseColor(this._color);
    }
    return this._parsedColor;
  }

  /**
   * Calculate light contribution at a point
   * Returns intensity multiplier (0-1+) for diffuse lighting
   */
  abstract calculateIntensityAt(
    point: Vector3,
    normal: Vector3
  ): number;

  /**
   * Get the light direction at a point (for specular calculations)
   * Returns normalized vector pointing FROM the point TO the light
   */
  abstract getLightDirectionAt(point: Vector3): Vector3;
}

/**
 * Directional light - simulates distant light source like the sun
 */
export class DirectionalLight extends Light {
  private _direction: Vector3 = new Vector3(0, -1, 0);

  constructor(options?: DirectionalLightOptions) {
    super(options);
    if (options?.direction) {
      this._direction = Vector3.fromArray(options.direction).normalize();
    }
  }

  get type(): LightType {
    return 'directional';
  }

  get direction(): Vector3 {
    return this._direction;
  }

  set direction(value: Vector3) {
    this._direction = value.normalize();
  }

  setDirection(x: number, y: number, z: number): this {
    this._direction = new Vector3(x, y, z).normalize();
    return this;
  }

  calculateIntensityAt(_point: Vector3, normal: Vector3): number {
    if (!this._enabled) return 0;

    // Light direction is inverted (direction points at surface, we need towards light)
    const lightDir = this._direction.negate();
    const dot = Math.max(0, normal.dot(lightDir));
    return dot * this._intensity;
  }

  getLightDirectionAt(_point: Vector3): Vector3 {
    return this._direction.negate();
  }
}

/**
 * Point light - simulates omnidirectional light source like a light bulb
 */
export class PointLight extends Light {
  private _position: Vector3 = new Vector3(0, 0, 0);
  private _range: number = 0; // 0 = infinite
  private _decay: number = 2; // Quadratic decay by default

  constructor(options?: PointLightOptions) {
    super(options);
    if (options?.position) {
      this._position = Vector3.fromArray(options.position);
    }
    if (options?.range !== undefined) {
      this._range = options.range;
    }
    if (options?.decay !== undefined) {
      this._decay = options.decay;
    }
  }

  get type(): LightType {
    return 'point';
  }

  get position(): Vector3 {
    return this._position;
  }

  set position(value: Vector3) {
    this._position = value;
  }

  setPosition(x: number, y: number, z: number): this {
    this._position = new Vector3(x, y, z);
    return this;
  }

  get range(): number {
    return this._range;
  }

  set range(value: number) {
    this._range = Math.max(0, value);
  }

  get decay(): number {
    return this._decay;
  }

  set decay(value: number) {
    this._decay = Math.max(0, value);
  }

  calculateIntensityAt(point: Vector3, normal: Vector3): number {
    if (!this._enabled) return 0;

    const lightDir = this._position.sub(point);
    const distance = lightDir.length();

    // Check range
    if (this._range > 0 && distance > this._range) {
      return 0;
    }

    // Normalize light direction
    const normalizedDir = distance > 0 ? lightDir.divideScalar(distance) : Vector3.up();

    // Calculate diffuse
    const dot = Math.max(0, normal.dot(normalizedDir));

    // Calculate attenuation
    let attenuation = 1;
    if (this._decay > 0 && distance > 0) {
      attenuation = 1 / Math.pow(distance + 1, this._decay);
    }

    return dot * this._intensity * attenuation;
  }

  getLightDirectionAt(point: Vector3): Vector3 {
    const dir = this._position.sub(point);
    return dir.length() > 0 ? dir.normalize() : Vector3.up();
  }
}

/**
 * Ambient light - provides uniform illumination everywhere
 */
export class AmbientLight extends Light {
  constructor(options?: AmbientLightOptions) {
    super(options);
    // Default ambient is lower intensity
    if (!options?.intensity) {
      this._intensity = 0.3;
    }
  }

  get type(): LightType {
    return 'ambient';
  }

  calculateIntensityAt(_point: Vector3, _normal: Vector3): number {
    if (!this._enabled) return 0;
    return this._intensity;
  }

  getLightDirectionAt(_point: Vector3): Vector3 {
    // Ambient has no direction - return up as placeholder
    return Vector3.up();
  }
}

/**
 * Spot light - simulates focused light like a flashlight or stage light
 */
export class SpotLight extends Light {
  private _position: Vector3 = new Vector3(0, 5, 0);
  private _direction: Vector3 = new Vector3(0, -1, 0);
  private _innerAngle: number = Math.PI / 8; // 22.5 degrees
  private _outerAngle: number = Math.PI / 4; // 45 degrees
  private _range: number = 0;
  private _decay: number = 2;

  constructor(options?: SpotLightOptions) {
    super(options);
    if (options?.position) {
      this._position = Vector3.fromArray(options.position);
    }
    if (options?.direction) {
      this._direction = Vector3.fromArray(options.direction).normalize();
    }
    if (options?.innerAngle !== undefined) {
      this._innerAngle = options.innerAngle;
    }
    if (options?.outerAngle !== undefined) {
      this._outerAngle = options.outerAngle;
    }
    if (options?.range !== undefined) {
      this._range = options.range;
    }
    if (options?.decay !== undefined) {
      this._decay = options.decay;
    }
  }

  get type(): LightType {
    return 'spot';
  }

  get position(): Vector3 {
    return this._position;
  }

  set position(value: Vector3) {
    this._position = value;
  }

  get direction(): Vector3 {
    return this._direction;
  }

  set direction(value: Vector3) {
    this._direction = value.normalize();
  }

  get innerAngle(): number {
    return this._innerAngle;
  }

  set innerAngle(value: number) {
    this._innerAngle = Math.max(0, value);
  }

  get outerAngle(): number {
    return this._outerAngle;
  }

  set outerAngle(value: number) {
    this._outerAngle = Math.max(this._innerAngle, value);
  }

  get range(): number {
    return this._range;
  }

  set range(value: number) {
    this._range = Math.max(0, value);
  }

  calculateIntensityAt(point: Vector3, normal: Vector3): number {
    if (!this._enabled) return 0;

    const lightToPoint = point.sub(this._position);
    const distance = lightToPoint.length();

    // Check range
    if (this._range > 0 && distance > this._range) {
      return 0;
    }

    // Check angle
    const normalizedLightToPoint = distance > 0 ? lightToPoint.divideScalar(distance) : this._direction;
    const spotAngle = Math.acos(Math.max(-1, Math.min(1, normalizedLightToPoint.dot(this._direction))));

    if (spotAngle > this._outerAngle) {
      return 0;
    }

    // Calculate spot falloff
    let spotFalloff = 1;
    if (spotAngle > this._innerAngle) {
      const t = (spotAngle - this._innerAngle) / (this._outerAngle - this._innerAngle);
      spotFalloff = 1 - t;
    }

    // Light direction towards the point
    const lightDir = this._position.sub(point).normalize();

    // Calculate diffuse
    const dot = Math.max(0, normal.dot(lightDir));

    // Calculate distance attenuation
    let attenuation = 1;
    if (this._decay > 0 && distance > 0) {
      attenuation = 1 / Math.pow(distance + 1, this._decay);
    }

    return dot * this._intensity * attenuation * spotFalloff;
  }

  getLightDirectionAt(point: Vector3): Vector3 {
    const dir = this._position.sub(point);
    return dir.length() > 0 ? dir.normalize() : this._direction.negate();
  }
}

/**
 * Factory function to create lights
 */
export function createLight(options: LightOptions): Light {
  switch (options.type) {
    case 'directional':
      return new DirectionalLight(options);
    case 'point':
      return new PointLight(options);
    case 'ambient':
      return new AmbientLight(options);
    case 'spot':
      return new SpotLight(options);
    default:
      throw new Error(`Unknown light type: ${(options as any).type}`);
  }
}

/**
 * Light manager - handles multiple lights in a scene
 */
export class LightManager {
  private lights: Light[] = [];
  private defaultAmbient: AmbientLight;

  constructor() {
    // Default ambient light
    this.defaultAmbient = new AmbientLight({ type: 'ambient', intensity: 0.2 });
  }

  /**
   * Add a light to the scene
   */
  addLight(light: Light): void {
    this.lights.push(light);
  }

  /**
   * Remove a light from the scene
   */
  removeLight(light: Light): void {
    const index = this.lights.indexOf(light);
    if (index !== -1) {
      this.lights.splice(index, 1);
    }
  }

  /**
   * Get all lights
   */
  getLights(): Light[] {
    return [...this.lights];
  }

  /**
   * Clear all lights
   */
  clear(): void {
    this.lights = [];
  }

  /**
   * Calculate total light intensity at a point
   * Returns { diffuse, specular } intensities
   */
  calculateLightingAt(
    point: Vector3,
    normal: Vector3,
    viewDir?: Vector3
  ): { diffuse: number; specular: number; ambient: number } {
    let diffuse = 0;
    let specular = 0;
    let ambient = 0;

    // Add default ambient if no ambient lights defined
    const hasAmbient = this.lights.some(l => l.type === 'ambient');
    if (!hasAmbient) {
      ambient = this.defaultAmbient.calculateIntensityAt(point, normal);
    }

    for (const light of this.lights) {
      if (!light.enabled) continue;

      if (light.type === 'ambient') {
        ambient += light.calculateIntensityAt(point, normal);
      } else {
        diffuse += light.calculateIntensityAt(point, normal);

        // Calculate specular if view direction provided
        if (viewDir) {
          const lightDir = light.getLightDirectionAt(point);
          // Reflect light around normal
          const dot = normal.dot(lightDir);
          const reflect = lightDir.sub(normal.multiplyScalar(2 * dot)).negate();
          const specDot = Math.max(0, reflect.dot(viewDir.negate()));
          // Use intensity squared for sharper highlights
          specular += Math.pow(specDot, 32) * light.intensity;
        }
      }
    }

    return { diffuse, specular, ambient };
  }

  /**
   * Set default ambient intensity
   */
  setDefaultAmbient(intensity: number): void {
    this.defaultAmbient.intensity = intensity;
  }
}
