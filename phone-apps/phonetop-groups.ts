/**
 * PhoneTop Groups Module
 *
 * Handles folder/category grouping for PhoneTop launcher.
 * Apps are grouped into folders by their @tsyne-app:category metadata.
 */

import { App } from '../core/src/app';
import { AppMetadata } from '../core/src/app-metadata';
import { Resvg } from '@resvg/resvg-wasm';

// Grid position in the launcher
export interface GridPosition {
  page: number;
  row: number;
  col: number;
}

// App icon state
export interface GridIcon {
  metadata: AppMetadata;
  position: GridPosition;
  resourceName?: string;  // Registered icon resource name (for SVG icons)
  /** Pre-loaded builder function for static apps (Android/iOS) */
  staticBuilder?: (...args: any[]) => void | Promise<void>;
}

// Folder containing apps grouped by category
export interface Folder {
  name: string;
  category: string;
  apps: GridIcon[];
  position: GridPosition;
}

// Grid item can be either an app icon or a folder
export type GridItem =
  | { type: 'app'; icon: GridIcon }
  | { type: 'folder'; folder: Folder };

// Category display names and folder icons (SVG for consistent sizing)
export const CATEGORY_CONFIG: Record<string, { displayName: string; icon: string }> = {
  'utilities': {
    displayName: 'Utilities',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M40 12L52 24M48 16L24 40L20 52L32 48L56 24C58 22 58 18 56 16L48 8C46 6 42 6 40 8L40 12Z"/><path d="M8 56L20 44"/><circle cx="14" cy="50" r="4" fill="#666"/></svg>`
  },
  'graphics': {
    displayName: 'Graphics',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="20" cy="44" r="12" fill="#E57373"/><circle cx="32" cy="24" r="12" fill="#81C784"/><circle cx="44" cy="44" r="12" fill="#64B5F6"/></svg>`
  },
  'games': {
    displayName: 'Games',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="18" width="52" height="32" rx="8" fill="#444"/><circle cx="20" cy="34" r="6" fill="#666"/><path d="M20 28v12M14 34h12" stroke="#999" stroke-width="2"/><circle cx="44" cy="30" r="3" fill="#E57373"/><circle cx="50" cy="36" r="3" fill="#81C784"/><circle cx="44" cy="42" r="3" fill="#64B5F6"/><circle cx="38" cy="36" r="3" fill="#FFD54F"/></svg>`
  },
  'media': {
    displayName: 'Media',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24" fill="#444"/><circle cx="32" cy="32" r="8" fill="#666"/><circle cx="32" cy="32" r="2" fill="#999"/><path d="M32 8v4M32 52v4M8 32h4M52 32h4"/></svg>`
  },
  'phone': {
    displayName: 'Phone',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="4" width="32" height="56" rx="4" fill="#444"/><line x1="26" y1="10" x2="38" y2="10" stroke="#666"/><circle cx="32" cy="52" r="3" fill="#666"/></svg>`
  },
  'system': {
    displayName: 'System',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3"><circle cx="32" cy="32" r="10"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6M14 14l4 4M46 46l4 4M14 50l4-4M46 18l4-4"/></svg>`
  },
  'fun': {
    displayName: 'Fun',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="36" r="22" fill="#FFD54F"/><circle cx="24" cy="32" r="3" fill="#444"/><circle cx="40" cy="32" r="3" fill="#444"/><path d="M22 44c4 6 16 6 20 0" stroke="#444" stroke-width="3"/></svg>`
  },
  'productivity': {
    displayName: 'Productivity',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M16 20h32M16 32h24M16 44h28" stroke="#999"/><path d="M48 24l-8 8-4-4" stroke="#81C784" stroke-width="3"/></svg>`
  },
  'creativity': {
    displayName: 'Creativity',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><path d="M32 8l6 18h18l-14 10 6 18-16-12-16 12 6-18-14-10h18z" fill="#FFD54F" stroke="#F9A825"/></svg>`
  },
  'development': {
    displayName: 'Development',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l-12 12 12 12M44 20l12 12-12 12M38 12l-12 40"/></svg>`
  },
  'native': {
    displayName: 'Native',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M20 32h24M32 20v24" stroke="#999" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#81C784"/></svg>`
  },
};

// Configuration for the folder manager
export interface FolderManagerConfig {
  /** Icon size in pixels */
  iconSize: number;
  /** Callback to rebuild the UI when folder state changes */
  onRebuild: () => void;
  /** Callback to launch an app */
  onLaunchApp: (metadata: AppMetadata) => void;
}

/**
 * Manages folder grouping and navigation for PhoneTop
 */
export class FolderManager {
  private a: App;
  private config: FolderManagerConfig;

  /** All folders by category */
  private folders: Map<string, Folder> = new Map();
  /** Cache of registered folder icon resources */
  private folderIconCache: Map<string, string> = new Map();
  /** Currently open folder (null = home screen) */
  private openFolder: Folder | null = null;
  /** Current page within the open folder */
  private currentPage: number = 0;
  /** Total pages in the open folder */
  private totalPages: number = 1;

  constructor(app: App, config: FolderManagerConfig) {
    this.a = app;
    this.config = config;
  }

  /**
   * Group icons into folders by category
   * Returns uncategorized icons that should appear on the home grid
   */
  groupIconsByCategory(icons: GridIcon[]): { folders: Folder[]; uncategorized: GridIcon[] } {
    const appsByCategory = new Map<string, GridIcon[]>();
    const uncategorized: GridIcon[] = [];

    for (const icon of icons) {
      const category = icon.metadata.category;
      if (category && CATEGORY_CONFIG[category]) {
        if (!appsByCategory.has(category)) {
          appsByCategory.set(category, []);
        }
        appsByCategory.get(category)!.push(icon);
      } else {
        uncategorized.push(icon);
      }
    }

    // Create folders for each category
    this.folders.clear();
    for (const [category, categoryApps] of appsByCategory) {
      const config = CATEGORY_CONFIG[category];
      this.folders.set(category, {
        name: config.displayName,
        category,
        apps: categoryApps,
        position: { page: 0, row: 0, col: 0 }  // Will be set during layout
      });
    }

    // Return sorted folders and uncategorized icons
    const sortedFolders = Array.from(this.folders.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    return { folders: sortedFolders, uncategorized };
  }

  /**
   * Prepare folder icon resources (render SVG to images)
   */
  async prepareFolderIcons(): Promise<void> {
    for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
      if (this.folderIconCache.has(category)) {
        continue;
      }

      try {
        const resourceName = `phone-folder-${category}`;
        const dataUri = this.renderSvgToDataUri(config.icon, this.config.iconSize);
        await this.a.resources.registerResource(resourceName, dataUri);
        this.folderIconCache.set(category, resourceName);
      } catch (err) {
        console.error(`Failed to register folder icon for ${category}:`, err);
      }
    }
  }

  /**
   * Get the resource name for a folder's icon
   */
  getFolderIconResource(category: string): string | undefined {
    return this.folderIconCache.get(category);
  }

  /**
   * Check if a folder is currently open
   */
  isOpen(): boolean {
    return this.openFolder !== null;
  }

  /**
   * Get the currently open folder
   */
  getOpenFolder(): Folder | null {
    return this.openFolder;
  }

  /**
   * Open a folder
   */
  open(folder: Folder): void {
    this.openFolder = folder;
    this.currentPage = 0;
    this.config.onRebuild();
  }

  /**
   * Close the currently open folder
   */
  close(): void {
    this.openFolder = null;
    this.currentPage = 0;
    this.config.onRebuild();
  }

  /**
   * Get current page number in folder view
   */
  getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * Get total pages in folder view
   */
  getTotalPages(): number {
    return this.totalPages;
  }

  /**
   * Navigate to previous page in folder
   */
  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.config.onRebuild();
    }
  }

  /**
   * Navigate to next page in folder
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.config.onRebuild();
    }
  }

  /**
   * Create the folder icon widget for the home grid
   */
  createFolderIcon(folder: Folder): void {
    const resourceName = this.folderIconCache.get(folder.category);

    this.a.center(() => {
      this.a.vbox(() => {
        if (resourceName) {
          this.a.image({
            resource: resourceName,
            fillMode: 'original',
            onClick: () => this.open(folder)
          }).withId(`folder-${folder.category}`);
        } else {
          // Fallback: button with folder emoji
          this.a.button('📁')
            .withId(`folder-${folder.category}`)
            .onClick(() => this.open(folder));
        }

        // Folder name (centered)
        this.a.label(folder.name, undefined, 'center');
      });
    });
  }

  /**
   * Create the folder contents grid view
   */
  createFolderView(
    cols: number,
    rows: number,
    appsPerPage: number,
    createAppIcon: (icon: GridIcon) => void
  ): void {
    if (!this.openFolder) return;

    const folder = this.openFolder;
    const totalApps = folder.apps.length;
    this.totalPages = Math.ceil(totalApps / appsPerPage);

    // Ensure current page is valid
    if (this.currentPage >= this.totalPages) {
      this.currentPage = Math.max(0, this.totalPages - 1);
    }

    // Get apps for current page
    const startIndex = this.currentPage * appsPerPage;
    const pageApps = folder.apps.slice(startIndex, startIndex + appsPerPage);

    // Create grid with same layout as home screen
    this.a.grid(cols, () => {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = row * cols + col;
          if (index < pageApps.length) {
            createAppIcon(pageApps[index]);
          } else {
            this.a.label('');  // Empty cell
          }
        }
      }
    });
  }

  /**
   * Create the folder header (icon + name + app count)
   */
  createFolderHeader(): void {
    if (!this.openFolder) return;

    const folder = this.openFolder;
    const resourceName = this.folderIconCache.get(folder.category);

    this.a.vbox(() => {
      this.a.center(() => {
        this.a.hbox(() => {
          if (resourceName) {
            this.a.image({ resource: resourceName, fillMode: 'original' });
          } else {
            this.a.label('📁');
          }
          this.a.label(` ${folder.name}`);
          this.a.label(` (${folder.apps.length} apps)`);
        });
      });
      this.a.separator();
    });
  }

  /**
   * Create page indicator dots for folder navigation
   */
  createPageIndicator(): void {
    if (this.totalPages <= 1) return;

    this.a.center(() => {
      this.a.hbox(() => {
        for (let i = 0; i < this.totalPages; i++) {
          const dot = i === this.currentPage ? '●' : '○';
          this.a.label(dot).withId(`folder-page-dot-${i}`);
        }
      });
    });
  }

  /**
   * Create folder navigation controls (back button + page nav)
   */
  createNavigationControls(): void {
    this.a.vbox(() => {
      // Page dots (if multiple pages)
      if (this.totalPages > 1) {
        this.createPageIndicator();
      }

      // Navigation buttons
      this.a.hbox(() => {
        this.a.button('← Back').onClick(() => this.close());
        this.a.spacer();

        if (this.totalPages > 1) {
          this.a.button('<').withId('folderPrev').onClick(() => this.previousPage());
          this.a.button('>').withId('folderNext').onClick(() => this.nextPage());
        }
      });
    });
  }

  /**
   * Render an SVG string to a PNG data URI
   */
  private renderSvgToDataUri(svg: string, size: number): string {
    const normalized = this.normalizeSvg(svg, size);
    const renderer = new Resvg(normalized, {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0,0,0,0)'
    });
    const png = renderer.render().asPng();
    const buffer = Buffer.from(png);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Normalize SVG for resvg (add xmlns, width/height if missing)
   */
  private normalizeSvg(svg: string, size: number): string {
    let s = svg.trim();
    if (!s.toLowerCase().startsWith('<svg')) {
      return s;
    }

    const match = s.match(/^<svg[^>]*>/i);
    if (!match) {
      return s;
    }

    const originalTag = match[0];
    const originalTagLength = originalTag.length;
    let tag = originalTag;

    const ensureAttr = (attr: string, value: string) => {
      if (tag.toLowerCase().includes(`${attr.toLowerCase()}=`)) {
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
    s = s.replace(/currentColor/gi, '#333333');

    return s;
  }
}
