/**
 * Material system for Cosyne 3D
 *
 * Provides material definitions for 3D primitives including colors,
 * shininess, transparency, and texture support.
 */

/**
 * Material properties for 3D primitives
 */
export interface MaterialProperties {
  /** Base color (hex string or named color) */
  color?: string;
  /** Shininess factor (0-1, affects specular highlights) */
  shininess?: number;
  /** Opacity (0-1, where 1 is fully opaque) */
  opacity?: number;
  /** Whether the material is transparent */
  transparent?: boolean;
  /** Emissive color (self-illumination) */
  emissive?: string;
  /** Emissive intensity (0-1) */
  emissiveIntensity?: number;
  /** Whether this material is affected by lights */
  unlit?: boolean;
  /** Wireframe mode */
  wireframe?: boolean;
  /** Whether the material is double-sided */
  doubleSided?: boolean;
  /** Flat shading (no interpolation) */
  flatShading?: boolean;
}

/**
 * Parsed color components (0-255)
 */
export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse hex color string to RGBA components
 */
export function parseColor(color: string): ColorRGBA {
  // Handle named colors
  const namedColors: Record<string, string> = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    white: '#ffffff',
    black: '#000000',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    orange: '#ffa500',
    purple: '#800080',
    pink: '#ffc0cb',
    gray: '#808080',
    grey: '#808080',
    brown: '#a52a2a',
    gold: '#ffd700',
    silver: '#c0c0c0',
    lime: '#00ff00',
    navy: '#000080',
    teal: '#008080',
    maroon: '#800000',
    olive: '#808000',
    aqua: '#00ffff',
  };

  let hex = namedColors[color.toLowerCase()] || color;

  // Remove # if present
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Handle 4-digit hex (with alpha)
  if (hex.length === 4) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  // Parse RGB(A)
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;

  return { r, g, b, a };
}

/**
 * Convert RGBA to hex string
 */
export function colorToHex(color: ColorRGBA): string {
  const r = Math.round(Math.max(0, Math.min(255, color.r)));
  const g = Math.round(Math.max(0, Math.min(255, color.g)));
  const b = Math.round(Math.max(0, Math.min(255, color.b)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Interpolate between two colors
 */
export function lerpColor(a: ColorRGBA, b: ColorRGBA, t: number): ColorRGBA {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  };
}

/**
 * Apply lighting to a color
 */
export function applyLighting(
  baseColor: ColorRGBA,
  lightIntensity: number,
  ambient: number = 0.2
): ColorRGBA {
  const intensity = ambient + (1 - ambient) * Math.max(0, Math.min(1, lightIntensity));
  return {
    r: Math.min(255, baseColor.r * intensity),
    g: Math.min(255, baseColor.g * intensity),
    b: Math.min(255, baseColor.b * intensity),
    a: baseColor.a,
  };
}

/**
 * Calculate specular highlight
 */
export function calculateSpecular(
  viewDir: { x: number; y: number; z: number },
  lightDir: { x: number; y: number; z: number },
  normal: { x: number; y: number; z: number },
  shininess: number
): number {
  // Reflect light direction around normal
  const dot = normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z;
  const reflectX = 2 * dot * normal.x - lightDir.x;
  const reflectY = 2 * dot * normal.y - lightDir.y;
  const reflectZ = 2 * dot * normal.z - lightDir.z;

  // Calculate specular intensity
  const specDot = Math.max(0, reflectX * viewDir.x + reflectY * viewDir.y + reflectZ * viewDir.z);
  return Math.pow(specDot, shininess * 128);
}

/**
 * Material class for 3D primitives
 */
export class Material {
  private _color: string = '#888888';
  private _shininess: number = 0.5;
  private _opacity: number = 1.0;
  private _transparent: boolean = false;
  private _emissive: string = '#000000';
  private _emissiveIntensity: number = 0;
  private _unlit: boolean = false;
  private _wireframe: boolean = false;
  private _doubleSided: boolean = false;
  private _flatShading: boolean = false;

  // Cached parsed colors
  private _parsedColor: ColorRGBA | null = null;
  private _parsedEmissive: ColorRGBA | null = null;

  constructor(props?: MaterialProperties) {
    if (props) {
      if (props.color !== undefined) this._color = props.color;
      if (props.shininess !== undefined) this._shininess = props.shininess;
      if (props.opacity !== undefined) this._opacity = props.opacity;
      if (props.transparent !== undefined) this._transparent = props.transparent;
      if (props.emissive !== undefined) this._emissive = props.emissive;
      if (props.emissiveIntensity !== undefined) this._emissiveIntensity = props.emissiveIntensity;
      if (props.unlit !== undefined) this._unlit = props.unlit;
      if (props.wireframe !== undefined) this._wireframe = props.wireframe;
      if (props.doubleSided !== undefined) this._doubleSided = props.doubleSided;
      if (props.flatShading !== undefined) this._flatShading = props.flatShading;
    }
  }

  static default(): Material {
    return new Material();
  }

  clone(): Material {
    return new Material({
      color: this._color,
      shininess: this._shininess,
      opacity: this._opacity,
      transparent: this._transparent,
      emissive: this._emissive,
      emissiveIntensity: this._emissiveIntensity,
      unlit: this._unlit,
      wireframe: this._wireframe,
      doubleSided: this._doubleSided,
      flatShading: this._flatShading,
    });
  }

  get color(): string {
    return this._color;
  }

  set color(value: string) {
    this._color = value;
    this._parsedColor = null;
  }

  get shininess(): number {
    return this._shininess;
  }

  set shininess(value: number) {
    this._shininess = Math.max(0, Math.min(1, value));
  }

  get opacity(): number {
    return this._opacity;
  }

  set opacity(value: number) {
    this._opacity = Math.max(0, Math.min(1, value));
  }

  get transparent(): boolean {
    return this._transparent;
  }

  set transparent(value: boolean) {
    this._transparent = value;
  }

  get emissive(): string {
    return this._emissive;
  }

  set emissive(value: string) {
    this._emissive = value;
    this._parsedEmissive = null;
  }

  get emissiveIntensity(): number {
    return this._emissiveIntensity;
  }

  set emissiveIntensity(value: number) {
    this._emissiveIntensity = Math.max(0, Math.min(1, value));
  }

  get unlit(): boolean {
    return this._unlit;
  }

  set unlit(value: boolean) {
    this._unlit = value;
  }

  get wireframe(): boolean {
    return this._wireframe;
  }

  set wireframe(value: boolean) {
    this._wireframe = value;
  }

  get doubleSided(): boolean {
    return this._doubleSided;
  }

  set doubleSided(value: boolean) {
    this._doubleSided = value;
  }

  get flatShading(): boolean {
    return this._flatShading;
  }

  set flatShading(value: boolean) {
    this._flatShading = value;
  }

  /**
   * Get parsed color components
   */
  getParsedColor(): ColorRGBA {
    if (!this._parsedColor) {
      this._parsedColor = parseColor(this._color);
    }
    return this._parsedColor;
  }

  /**
   * Get parsed emissive color components
   */
  getParsedEmissive(): ColorRGBA {
    if (!this._parsedEmissive) {
      this._parsedEmissive = parseColor(this._emissive);
    }
    return this._parsedEmissive;
  }

  /**
   * Calculate final color with lighting applied
   */
  calculateFinalColor(
    lightIntensity: number,
    specularIntensity: number = 0,
    ambientIntensity: number = 0.2
  ): ColorRGBA {
    const baseColor = this.getParsedColor();

    if (this._unlit) {
      return {
        r: baseColor.r,
        g: baseColor.g,
        b: baseColor.b,
        a: baseColor.a * this._opacity,
      };
    }

    // Apply diffuse lighting
    const diffuse = applyLighting(baseColor, lightIntensity, ambientIntensity);

    // Add specular highlights
    const specular = specularIntensity * this._shininess * 255;

    // Add emissive
    const emissive = this.getParsedEmissive();
    const emissiveContribution = this._emissiveIntensity;

    return {
      r: Math.min(255, diffuse.r + specular + emissive.r * emissiveContribution),
      g: Math.min(255, diffuse.g + specular + emissive.g * emissiveContribution),
      b: Math.min(255, diffuse.b + specular + emissive.b * emissiveContribution),
      a: baseColor.a * this._opacity,
    };
  }

  /**
   * Convert to properties object
   */
  toProperties(): MaterialProperties {
    return {
      color: this._color,
      shininess: this._shininess,
      opacity: this._opacity,
      transparent: this._transparent,
      emissive: this._emissive,
      emissiveIntensity: this._emissiveIntensity,
      unlit: this._unlit,
      wireframe: this._wireframe,
      doubleSided: this._doubleSided,
      flatShading: this._flatShading,
    };
  }

  /**
   * Update material from properties
   */
  setProperties(props: MaterialProperties): this {
    if (props.color !== undefined) this.color = props.color;
    if (props.shininess !== undefined) this.shininess = props.shininess;
    if (props.opacity !== undefined) this.opacity = props.opacity;
    if (props.transparent !== undefined) this.transparent = props.transparent;
    if (props.emissive !== undefined) this.emissive = props.emissive;
    if (props.emissiveIntensity !== undefined) this.emissiveIntensity = props.emissiveIntensity;
    if (props.unlit !== undefined) this.unlit = props.unlit;
    if (props.wireframe !== undefined) this.wireframe = props.wireframe;
    if (props.doubleSided !== undefined) this.doubleSided = props.doubleSided;
    if (props.flatShading !== undefined) this.flatShading = props.flatShading;
    return this;
  }
}

/**
 * Pre-defined materials
 */
export const Materials = {
  /** Matte red */
  red: () => new Material({ color: '#ff0000', shininess: 0.2 }),
  /** Matte green */
  green: () => new Material({ color: '#00ff00', shininess: 0.2 }),
  /** Matte blue */
  blue: () => new Material({ color: '#0000ff', shininess: 0.2 }),
  /** Matte white */
  white: () => new Material({ color: '#ffffff', shininess: 0.3 }),
  /** Matte black */
  black: () => new Material({ color: '#000000', shininess: 0.1 }),
  /** Shiny gold */
  gold: () => new Material({ color: '#ffd700', shininess: 0.9 }),
  /** Shiny silver */
  silver: () => new Material({ color: '#c0c0c0', shininess: 0.95 }),
  /** Matte gray */
  gray: () => new Material({ color: '#808080', shininess: 0.2 }),
  /** Glass-like transparent */
  glass: () => new Material({ color: '#aaddff', shininess: 1.0, opacity: 0.3, transparent: true }),
  /** Glowing material */
  emissive: (color: string = '#ff8800') => new Material({
    color: color,
    emissive: color,
    emissiveIntensity: 0.8,
    shininess: 0.5,
  }),
  /** Wireframe */
  wireframe: (color: string = '#00ff00') => new Material({ color, wireframe: true }),
  /** Unlit (not affected by lighting) */
  unlit: (color: string = '#ffffff') => new Material({ color, unlit: true }),
};
