/**
 * Desktop Icon Resource Management
 *
 * Handles SVG rendering, icon resource registration, and position persistence.
 */

import * as path from 'path';
import { App } from 'tsyne';
import { AppMetadata } from 'tsyne';
import { Resvg } from 'tsyne';
import { ICON_SIZE, ICON_SPACING, ICON_POSITION_PREFIX } from './desktop_types';

/**
 * Manages icon resources and position persistence for the desktop
 */
export class DesktopIconManager {
  private app: App;
  /** Cache of registered icon resources keyed by source file */
  private iconResourceCache: Map<string, string> = new Map();
  /** Cache of folder icon resources by category */
  private folderIconCache: Map<string, string> = new Map();

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Get a sanitized key for an app name (for use in preferences)
   */
  getIconKey(appName: string): string {
    return appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Render an inline SVG into a PNG data URI for desktop icons
   */
  renderSvgIconToDataUri(svg: string, size: number = ICON_SIZE): string {
    const normalized = this.normalizeSvg(svg, size);
    const renderer = new Resvg(normalized, {
      fitTo: {
        mode: 'width',
        value: size
      },
      background: 'rgba(0,0,0,0)'
    });
    const png = renderer.render().asPng();
    const buffer = Buffer.from(png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Ensure inline SVG has the basics resvg expects (xmlns, width/height)
   */
  normalizeSvg(svg: string, size: number): string {
    let s = svg.trim();
    if (!s.toLowerCase().startsWith('<svg')) {
      return s;
    }

    const match = s.match(/^<svg[^>]*>/i);
    if (!match) {
      return s;
    }

    const originalTagLength = match[0].length;
    let tag = match[0];
    const ensureAttr = (attr: string, value: string) => {
      // Use regex to match attribute properly (with word boundary or space before)
      // This avoids false positives like "stroke-width" matching "width"
      const attrRegex = new RegExp(`(^|\\s)${attr}\\s*=`, 'i');
      if (attrRegex.test(tag)) {
        return;
      }
      tag = tag.slice(0, -1) + ` ${attr}="${value}">`;
    };

    ensureAttr('xmlns', 'http://www.w3.org/2000/svg');
    ensureAttr('width', size.toString());
    ensureAttr('height', size.toString());
    if (!/viewbox=/i.test(tag)) {
      ensureAttr('viewBox', `0 0 ${size} ${size}`);
    }
    ensureAttr('preserveAspectRatio', 'xMidYMid meet');

    s = tag + s.slice(originalTagLength);
    return s;
  }

  /**
   * Convert an app's @tsyne-app:icon into a registered resource (if possible)
   */
  async prepareIconResource(metadata: AppMetadata): Promise<string | undefined> {
    const cacheKey = metadata.filePath;
    if (this.iconResourceCache.has(cacheKey)) {
      return this.iconResourceCache.get(cacheKey);
    }

    if (!metadata.iconIsSvg || !metadata.icon) {
      return undefined;
    }

    try {
      const dataUri = this.renderSvgIconToDataUri(metadata.icon, ICON_SIZE);
      const baseName = path.basename(metadata.filePath, '.ts');
      const resourceName = `desktop-icon-${this.getIconKey(`${metadata.name}-${baseName}`)}`;
      await this.app.resources.registerResource(resourceName, dataUri);
      this.iconResourceCache.set(cacheKey, resourceName);
      return resourceName;
    } catch (err) {
      console.error(`Failed to register desktop icon for ${metadata.name}:`, err);
      return undefined;
    }
  }

  /**
   * Prepare a generic image icon resource for file icons
   */
  async prepareFileIconResource(): Promise<string | undefined> {
    // Generic image/photo icon SVG
    const imageSvg = `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="8" width="48" height="48" rx="4" fill="#f0f0f0"/>
      <circle cx="24" cy="24" r="6" fill="#FFD54F"/>
      <path d="M8 44 L24 32 L36 44 L48 28 L56 40 L56 52 C56 54.2 54.2 56 52 56 L12 56 C9.8 56 8 54.2 8 52 Z" fill="#81C784"/>
    </svg>`;

    try {
      const normalized = this.normalizeSvg(imageSvg, ICON_SIZE);
      const renderer = new Resvg(normalized, {
        fitTo: { mode: 'width', value: ICON_SIZE },
        background: 'rgba(0,0,0,0)'
      });
      const png = renderer.render().asPng();
      const buffer = Buffer.from(png);
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

      const resourceName = `file-icon-image`;
      await this.app.resources.registerResource(resourceName, dataUri);
      return resourceName;
    } catch (err) {
      console.error('Failed to prepare file icon resource:', err);
      return undefined;
    }
  }

  /**
   * Prepare a folder icon resource (render SVG to PNG)
   */
  async prepareFolderIconResource(category: string, svg: string): Promise<string | undefined> {
    if (this.folderIconCache.has(category)) {
      return this.folderIconCache.get(category);
    }

    try {
      const normalized = this.normalizeSvg(svg, ICON_SIZE);
      const renderer = new Resvg(normalized, {
        fitTo: { mode: 'width', value: ICON_SIZE },
        background: 'rgba(0,0,0,0)'
      });
      const png = renderer.render().asPng();
      const buffer = Buffer.from(png);
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

      const resourceName = `desktop-folder-${category}`;
      await this.app.resources.registerResource(resourceName, dataUri);
      this.folderIconCache.set(category, resourceName);
      return resourceName;
    } catch (err) {
      console.error(`Failed to register folder icon for ${category}:`, err);
      return undefined;
    }
  }

  /**
   * Save icon position to preferences
   */
  saveIconPosition(appName: string, x: number, y: number): void {
    const key = this.getIconKey(appName);
    this.app.setPreference(`${ICON_POSITION_PREFIX}${key}.x`, x.toString());
    this.app.setPreference(`${ICON_POSITION_PREFIX}${key}.y`, y.toString());
  }

  /**
   * Load icon position from preferences
   * Returns null if no saved position exists
   */
  async loadIconPosition(appName: string): Promise<{ x: number; y: number } | null> {
    const key = this.getIconKey(appName);
    const xStr = await this.app.getPreference(`${ICON_POSITION_PREFIX}${key}.x`, '');
    const yStr = await this.app.getPreference(`${ICON_POSITION_PREFIX}${key}.y`, '');

    if (xStr && yStr) {
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      if (!isNaN(x) && !isNaN(y)) {
        return { x, y };
      }
    }
    return null;
  }

  /**
   * Calculate default grid position for an icon
   */
  calculateGridPosition(index: number, gridCols: number = 8): { x: number; y: number } {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    return {
      x: col * ICON_SPACING + 20,
      y: row * ICON_SPACING + 20
    };
  }
}
