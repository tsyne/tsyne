/**
 * Tsyne Browser - Swiby-style browser for loading Tsyne pages from web servers
 *
 * Enables dynamic loading of Tsyne TypeScript pages from HTTP servers,
 * similar to how Mosaic/Firefox/Chrome load HTML pages.
 *
 * Architecture:
 * - ONE persistent browser window (like real browsers)
 * - Browser chrome (address bar, navigation buttons)
 * - Pages render into content area only
 * - Window size controlled by user, not pages
 */

import http from 'http';
import https from 'https';
import { ClientRequest } from 'http';
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App } from './app';
import { Window } from './window';
import { Entry, Label, Button } from './widgets';
import { setBrowserGlobals, TsyneLocation, TsyneHistory } from './globals';
import { BridgeInterface } from './fynebridge';

/**
 * Custom menu item that pages can define
 */
export interface PageMenuItem {
  label: string;
  onSelected: () => void;
  disabled?: boolean;
  checked?: boolean;
}

/**
 * Menu item definition for browser menu bar
 */
interface MenuItem {
  label?: string;
  onSelected?: () => void;
  isSeparator?: boolean;
  disabled?: boolean;
}

/**
 * Menu definition with nested items
 */
interface MenuDefinition {
  label: string;
  items: MenuItem[];
}

/**
 * Browser context passed to loaded pages
 */
export interface BrowserContext {
  /** Navigate back in history */
  back: () => Promise<void>;

  /** Navigate forward in history */
  forward: () => Promise<void>;

  /** Navigate to a new URL */
  changePage: (url: string) => Promise<void>;

  /** Reload current page */
  reload: () => Promise<void>;

  /** Stop loading current page */
  stop: () => void;

  /** Navigate to home page */
  home: () => Promise<void>;

  /** Set the page title (updates window title bar) */
  setPageTitle: (title: string) => void;

  /** Set the status bar text */
  setStatus: (status: string) => void;

  /** Add custom menu items to browser menu bar */
  addPageMenu: (menuLabel: string, items: PageMenuItem[]) => void;

  /** Current URL */
  currentUrl: string;

  /** Is page currently loading */
  isLoading: boolean;

  /** Browser instance */
  browser: Browser;
}

/**
 * History entry for browser navigation
 */
interface HistoryEntry {
  url: string;
  pageCode: string;
  visitedAt?: number;  // Timestamp when page was visited (optional for backward compatibility)
  title?: string;  // Page title (optional, for better history display)
}

/**
 * Cache entry for fetched pages
 */
interface CacheEntry {
  url: string;
  pageCode: string;
  fetchedAt: number;  // Timestamp when page was fetched
}

/**
 * Bookmark entry for saved pages
 */
interface Bookmark {
  title: string;  // Page title or user-entered name
  url: string;
  addedAt: number;  // Timestamp when bookmark was added
}

/**
 * Browser for loading and displaying Tsyne pages from web servers
 *
 * Similar to Swiby's browser concept - loads pages dynamically from servers
 * that can be implemented in any language (Spring, Sinatra, Flask, etc.)
 *
 * Key feature: Uses ONE persistent window, pages render into content area
 */
export class Browser {
  private app: App;
  private window: Window;
  private addressBarEntry: Entry | null = null;
  private loadingLabel: Label | null = null;
  private stopButton: Button | null = null;
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private currentUrl: string = '';
  private loading: boolean = false;
  private currentRequest: ClientRequest | null = null;
  private currentPageBuilder: (() => void) | null = null;
  private pageMenus: Map<string, PageMenuItem[]> = new Map();
  private testMode: boolean = false;
  private firstPageLoaded: boolean = false;
  private homeUrl: string = '';
  private pageTitle: string = '';
  private baseTitle: string = '';
  private statusText: string = 'Ready';
  private statusBarLabel: Label | null = null;
  private pageCache: Map<string, CacheEntry> = new Map();
  private historyFilePath: string;
  private bookmarks: Bookmark[] = [];
  private bookmarksFilePath: string;
  private findQuery: string = '';
  private findMatches: number[] = [];  // Positions of matches in page code
  private findCurrentIndex: number = -1;  // Current match index (0-based)

  constructor(options?: { title?: string; width?: number; height?: number; testMode?: boolean; homeUrl?: string }) {
    this.testMode = options?.testMode || false;

    // Set up history and bookmarks file paths in user's home directory
    const tsyneDir = path.join(os.homedir(), '.tsyne');
    this.historyFilePath = path.join(tsyneDir, 'browser-history.json');
    this.bookmarksFilePath = path.join(tsyneDir, 'browser-bookmarks.json');

    // Load history and bookmarks from disk
    this.loadHistory();
    this.loadBookmarks();

    this.homeUrl = options?.homeUrl || '';
    this.baseTitle = options?.title || 'Tsyne Browser';
    this.app = new App({ title: this.baseTitle }, this.testMode);

    // Register hyperlink navigation event handler
    const appBridge = this.app.getBridge();
    appBridge.registerEventHandler('hyperlinkNavigation', (data: unknown) => {
      const navData = data as { url?: string };
      if (navData && navData.url && typeof navData.url === 'string') {
        this.changePage(navData.url).catch(err => console.error('Hyperlink navigation failed:', err));
      }
    });

    // Set global context for the browser's app so global API calls work
    const { __setGlobalContext } = require('./index');
    __setGlobalContext(this.app, this.app.getContext());

    // Create ONE persistent browser window with initial placeholder content
    // CRITICAL: We must provide content during window creation (not via setContent after)
    // Otherwise Fyne shows a black window that doesn't update when setContent is called later
    this.window = this.app.window(
      {
        title: this.baseTitle,
        width: options?.width || 900,
        height: options?.height || 700
      },
      (win) => {
        // Call buildWindowContent() SYNCHRONOUSLY in builder
        // This provides initial placeholder content that Fyne can display
        // Later calls to setContent() will properly replace this
        this.buildWindowContent();
      }
    );

    // Set up browser menu bar after window is created
    this.setupMenuBar();
  }

  /**
   * Set up the browser menu bar
   */
  private async setupMenuBar(): Promise<void> {
    const menuDefinition: MenuDefinition[] = [
      {
        label: 'File',
        items: [
          {
            label: 'Close Window',
            onSelected: () => {
              process.exit(0);
            }
          }
        ]
      },
      {
        label: 'View',
        items: [
          {
            label: 'Reload',
            onSelected: () => {
              this.reload().catch(err => console.error('Reload failed:', err));
            }
          },
          {
            label: 'Stop',
            onSelected: () => {
              this.stop();
            }
          },
          {
            isSeparator: true
          },
          {
            label: 'Find in Page...',
            onSelected: async () => {
              if (this.historyIndex >= 0) {
                // In a real implementation, this would show a find dialog
                // For now, we just show info that find API is available
                await this.window.showInfo(
                  'Find in Page',
                  'Find API is available via browser methods:\n\n' +
                  '- findInPage(query, caseSensitive?)\n' +
                  '- findNext()\n' +
                  '- findPrevious()\n' +
                  '- clearFind()\n\n' +
                  'Pages can use: browserContext.browser.findInPage("text")'
                );
              }
            },
            disabled: this.historyIndex < 0
          },
          {
            label: 'Find Next',
            onSelected: () => {
              this.findNext();
            },
            disabled: this.findMatches.length === 0
          },
          {
            label: 'Find Previous',
            onSelected: () => {
              this.findPrevious();
            },
            disabled: this.findMatches.length === 0
          },
          {
            isSeparator: true
          },
          {
            label: 'View Page Source',
            onSelected: async () => {
              if (this.historyIndex >= 0) {
                const entry = this.history[this.historyIndex];
                // DEBUG: console.log('\n========== Page Source ==========');
                // DEBUG: console.log(`URL: ${entry.url}`);
                // DEBUG: console.log('==================================');
                // DEBUG: console.log(entry.pageCode);
                // DEBUG: console.log('==================================\n');
              }
            }
          }
        ]
      },
      {
        label: 'History',
        items: [
          {
            label: 'Back',
            onSelected: () => {
              this.back().catch(err => console.error('Back failed:', err));
            },
            disabled: this.historyIndex <= 0
          },
          {
            label: 'Forward',
            onSelected: () => {
              this.forward().catch(err => console.error('Forward failed:', err));
            },
            disabled: this.historyIndex >= this.history.length - 1
          },
          {
            isSeparator: true
          },
          {
            label: 'Home',
            onSelected: () => {
              this.home().catch(err => console.error('Home failed:', err));
            },
            disabled: !this.homeUrl
          },
          {
            isSeparator: true
          },
          {
            label: 'Show History',
            onSelected: () => {
              this.showHistory();
            },
            disabled: this.history.length === 0
          },
          {
            label: 'Clear History',
            onSelected: () => {
              this.clearHistory().catch(err => console.error('Clear history failed:', err));
            },
            disabled: this.history.length === 0
          }
        ]
      },
      {
        label: 'Bookmarks',
        items: [
          {
            label: 'Add Bookmark',
            onSelected: () => {
              this.addBookmark().catch(err => console.error('Add bookmark failed:', err));
            },
            disabled: !this.currentUrl
          },
          {
            isSeparator: true
          },
          {
            label: 'Export Bookmarks...',
            onSelected: () => {
              this.exportBookmarks().catch(err => console.error('Export bookmarks failed:', err));
            },
            disabled: this.bookmarks.length === 0
          },
          {
            label: 'Import Bookmarks...',
            onSelected: async () => {
              // For now, use a hardcoded path; in a real implementation, would show file dialog
              const importPath = path.join(process.cwd(), 'bookmarks-export.json');
              await this.importBookmarks(importPath, true).catch(err => console.error('Import bookmarks failed:', err));
            }
          },
          {
            isSeparator: true
          },
          // Dynamic bookmark list
          ...this.bookmarks.map(bookmark => ({
            label: bookmark.title,
            onSelected: () => {
              this.changePage(bookmark.url).catch(err => console.error('Navigate to bookmark failed:', err));
            }
          }))
        ]
      },
      {
        label: 'Help',
        items: [
          {
            label: 'About Tsyne Browser',
            onSelected: async () => {
              await this.window.showInfo(
                'About Tsyne Browser',
                'Tsyne Browser - Load TypeScript pages from web servers\n\nVersion 0.1.0'
              );
            }
          }
        ]
      }
    ];

    // Add page-defined menus
    for (const [menuLabel, items] of this.pageMenus.entries()) {
      menuDefinition.push({
        label: menuLabel,
        items: items.map(item => ({
          label: item.label,
          onSelected: item.onSelected,
          disabled: item.disabled,
          checked: item.checked
        }))
      });
    }

    await this.window.setMainMenu(menuDefinition as Array<{
      label: string;
      items: Array<{
        label: string;
        onSelected?: () => void;
        isSeparator?: boolean;
        disabled?: boolean;
        checked?: boolean;
      }>;
    }>);
  }

  /**
   * Build the complete window content: browser chrome + page content
   */
  private buildWindowContent(): void {
    // DEBUG: console.log('[buildWindowContent] Called - currentPageBuilder:', this.currentPageBuilder !== null ? 'SET' : 'NULL');
    const { vbox, hbox, button, entry, separator, scroll, label, border } = require('./index');

    // Use border layout at top level: chrome at top, content in center, status bar at bottom
    border({
      top: () => {
        vbox(() => {
          // Browser chrome (address bar and navigation buttons)
          // Use border layout to make address bar expand
          border({
            left: () => {
              hbox(() => {
                button('←', () => {
                  this.back().catch(err => console.error('Back failed:', err));
                });

                button('→', () => {
                  this.forward().catch(err => console.error('Forward failed:', err));
                });

                button('⟳', () => {
                  this.reload().catch(err => console.error('Reload failed:', err));
                });

                // Home button (only visible when homeUrl is configured)
                if (this.homeUrl) {
                  button('🏠', () => {
                    this.home().catch(err => console.error('Home failed:', err));
                  });
                }

                // Stop button (only visible when loading)
                if (this.loading) {
                  this.stopButton = button('✕', () => {
                    this.stop();
                  });
                }
              });
            },
            center: () => {
              // Address bar expands to fill available space
              // Add onSubmit callback for Enter key navigation
              this.addressBarEntry = entry(this.currentUrl || 'http://', async () => {
                if (this.addressBarEntry) {
                  const url = await this.addressBarEntry.getText();
                  await this.changePage(url);
                }
              });
            },
            right: () => {
              hbox(() => {
                // Loading indicator
                if (this.loading) {
                  this.loadingLabel = label('Loading...');
                }

                button('Go', async () => {
                  if (this.addressBarEntry) {
                    const url = await this.addressBarEntry.getText();
                    await this.changePage(url);
                  }
                });
              });
            }
          });

          separator();
        });
      },
      center: () => {
        // Page content area (scrollable) - fills remaining space
        scroll(() => {
          vbox(() => {
            if (this.currentPageBuilder !== null) {
              // Render current page content
              // DEBUG: console.log('[buildWindowContent] Rendering page content - calling currentPageBuilder()');
              this.currentPageBuilder();
              // DEBUG: console.log('[buildWindowContent] Page content rendered');
            } else {
              // Welcome message when no page loaded
              // DEBUG: console.log('[buildWindowContent] No currentPageBuilder - rendering placeholder');
              label('Tsyne Browser');
              label('');
              label('Enter a URL in the address bar and click Go to navigate.');
            }
          });
        });
      },
      bottom: () => {
        // Status bar at bottom
        vbox(() => {
          separator();
          hbox(() => {
            this.statusBarLabel = label(this.statusText);
          });
        });
      }
    });
  }

  /**
   * Validate URL format before navigation
   */
  private validateUrl(url: string): { valid: boolean; error?: string } {
    // Check for empty URL
    if (!url || url.trim().length === 0) {
      return { valid: false, error: 'URL cannot be empty' };
    }

    url = url.trim();

    // Allow relative URLs starting with /
    if (url.startsWith('/')) {
      if (!this.currentUrl) {
        return { valid: false, error: 'Cannot navigate to relative URL without a current page' };
      }
      return { valid: true };
    }

    // Check for supported protocols
    const hasProtocol = url.includes('://');
    if (!hasProtocol) {
      return { valid: false, error: 'URL must include a protocol (http:// or https://)' };
    }

    const protocol = url.split('://')[0].toLowerCase();
    if (protocol !== 'http' && protocol !== 'https') {
      return { valid: false, error: `Unsupported protocol: ${protocol}:// (only http:// and https:// are supported)` };
    }

    // Try parsing URL
    try {
      const urlObj = new URL(url);

      // Check for valid hostname
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return { valid: false, error: 'URL must include a hostname' };
      }

      return { valid: true };
    } catch (e) {
      return { valid: false, error: `Invalid URL format: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  /**
   * Navigate to a URL and load the Tsyne page
   */
  async changePage(url: string): Promise<void> {
    // DEBUG: console.log('changePage called with URL:', url);

    if (this.loading) {
      // DEBUG: console.log('Page already loading, ignoring navigation');
      return;
    }

    // Validate URL format
    const validation = this.validateUrl(url);
    if (!validation.valid) {
      console.error('Invalid URL:', validation.error);
      this.statusText = `Invalid URL: ${validation.error}`;
      await this.showError(url, new Error(validation.error || 'Invalid URL'));
      return;
    }

    // Handle relative URLs - convert to full URL using current URL's origin
    if (url.startsWith('/') && this.currentUrl) {
      try {
        const currentUrlObj = new URL(this.currentUrl);
        const fullUrl = `${currentUrlObj.protocol}//${currentUrlObj.host}${url}`;
        // DEBUG: console.log('Converted relative URL to full URL:', fullUrl);
        url = fullUrl;
      } catch (e) {
        console.error('Failed to convert relative URL:', e);
      }
    }

    this.loading = true;
    this.currentUrl = url;
    // DEBUG: console.log('Starting navigation to:', url);

    // Update address bar
    if (this.addressBarEntry) {
      this.addressBarEntry.setText(url);
    }

    // Don't call updateUI() here - it would re-render the current page with new callback IDs,
    // breaking the button that was just clicked

    try {
      let pageCode: string;
      let fromCache = false;

      // Check cache first
      const cachedEntry = this.pageCache.get(url);
      if (cachedEntry) {
        // Cache hit - use cached page
        // DEBUG: console.log('Cache hit for URL:', url);
        pageCode = cachedEntry.pageCode;
        fromCache = true;
        this.statusText = `Loaded from cache: ${url}`;
      } else {
        // Cache miss - fetch from server
        // DEBUG: console.log('Cache miss for URL:', url);
        this.statusText = `Loading ${url}...`;
        pageCode = await this.fetchPage(url);

        // Check if loading was cancelled
        if (!this.loading) {
          // DEBUG: console.log('Loading cancelled');
          this.statusText = 'Ready';
          return;
        }

        // Add to cache
        this.pageCache.set(url, {
          url,
          pageCode,
          fetchedAt: Date.now()
        });
        // DEBUG: console.log('Added to cache:', url);
      }

      // Add to history (clear forward history if navigating from middle)
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      this.history.push({
        url,
        pageCode,
        visitedAt: Date.now(),
        title: this.pageTitle || url  // Will be updated after page renders
      });
      this.historyIndex = this.history.length - 1;

      // Save history to disk
      this.saveHistory();

      // Render the page
      await this.renderPage(pageCode);

      // Page rendered successfully - stop loading and update status
      this.loading = false;
      this.currentRequest = null;
      this.statusText = fromCache ? 'Loaded from cache' : 'Done';
      await this.setupMenuBar();  // Update menu bar to reflect new history state

      // Update browser globals
      this.updateBrowserGlobals();
    } catch (error) {
      if (this.loading) {  // Only show error if not stopped
        await this.showError(url, error);
      }
      this.loading = false;
      this.currentRequest = null;
      this.statusText = 'Error loading page';
    }
  }

  /**
   * Stop loading current page
   */
  async stop(): Promise<void> {
    if (!this.loading) {
      return;
    }

    // DEBUG: console.log('Stopping page load');
    this.loading = false;

    // Abort current HTTP request
    if (this.currentRequest) {
      this.currentRequest.destroy();
      this.currentRequest = null;
    }

    await this.updateUI();
  }

  /**
   * Update UI to reflect current state
   */
  private async updateUI(): Promise<void> {
    // Re-render window to update stop button and loading indicator
    await this.window.setContent(() => {
      this.buildWindowContent();
    });

    // Update menu bar to reflect current state
    await this.setupMenuBar();
  }

  /**
   * Add custom page menu to browser menu bar
   */
  addPageMenu(menuLabel: string, items: PageMenuItem[]): void {
    this.pageMenus.set(menuLabel, items);
    this.setupMenuBar();
  }

  /**
   * Navigate back in history
   */
  async back(): Promise<void> {
    if (this.historyIndex <= 0) {
      // DEBUG: console.log('No previous page in history');
      return;
    }

    this.historyIndex--;
    const entry = this.history[this.historyIndex];
    this.currentUrl = entry.url;

    // Update address bar
    if (this.addressBarEntry) {
      this.addressBarEntry.setText(this.currentUrl);
    }

    // Save history to disk (preserves historyIndex)
    this.saveHistory();

    this.statusText = 'Navigated back';
    await this.renderPage(entry.pageCode);

    // Update browser globals
    this.updateBrowserGlobals();
  }

  /**
   * Navigate forward in history
   */
  async forward(): Promise<void> {
    if (this.historyIndex >= this.history.length - 1) {
      // DEBUG: console.log('No next page in history');
      return;
    }

    this.historyIndex++;
    const entry = this.history[this.historyIndex];
    this.currentUrl = entry.url;

    // Update address bar
    if (this.addressBarEntry) {
      this.addressBarEntry.setText(this.currentUrl);
    }

    // Save history to disk (preserves historyIndex)
    this.saveHistory();

    this.statusText = 'Navigated forward';
    await this.renderPage(entry.pageCode);

    // Update browser globals
    this.updateBrowserGlobals();
  }

  /**
   * Reload current page
   */
  async reload(): Promise<void> {
    if (this.currentUrl && this.historyIndex >= 0) {
      const entry = this.history[this.historyIndex];
      this.statusText = 'Reloading page...';
      await this.renderPage(entry.pageCode);
      this.statusText = 'Done';

      // Update browser globals
      this.updateBrowserGlobals();
    }
  }

  /**
   * Navigate to home page
   */
  async home(): Promise<void> {
    if (this.homeUrl) {
      await this.changePage(this.homeUrl);
    } else {
      // DEBUG: console.log('No home URL configured');
    }
  }

  /**
   * Update browser globals (location and history) for browser compatibility
   * This allows npm packages designed for browsers to work in Tsyne browser mode
   */
  private updateBrowserGlobals(): void {
    if (!this.currentUrl) {
      return;
    }

    try {
      const urlObj = new URL(this.currentUrl);

      // Create location object
      const location: TsyneLocation = {
        href: urlObj.href,
        protocol: urlObj.protocol,
        host: urlObj.host,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        origin: urlObj.origin,
        reload: () => {
          this.reload();
        },
        replace: (url: string) => {
          // Replace current history entry
          if (this.historyIndex >= 0 && this.history[this.historyIndex]) {
            this.history[this.historyIndex].url = url;
            this.saveHistory();
          }
          this.changePage(url);
        },
        assign: (url: string) => {
          this.changePage(url);
        }
      };

      // Create history object
      const history: TsyneHistory = {
        length: this.history.length,
        state: null,
        back: () => {
          this.back();
        },
        forward: () => {
          this.forward();
        },
        go: (delta?: number) => {
          if (delta === undefined || delta === 0) {
            this.reload();
          } else if (delta < 0) {
            // Go back
            for (let i = 0; i < Math.abs(delta); i++) {
              this.back();
            }
          } else {
            // Go forward
            for (let i = 0; i < delta; i++) {
              this.forward();
            }
          }
        },
        pushState: (state: unknown, title: string, url?: string) => {
          // For now, we don't support pushState fully
          // DEBUG: console.log('[Browser] pushState not fully implemented:', { state, title, url });
        },
        replaceState: (state: unknown, title: string, url?: string) => {
          // For now, we don't support replaceState fully
          // DEBUG: console.log('[Browser] replaceState not fully implemented:', { state, title, url });
        }
      };

      // Set browser globals
      setBrowserGlobals(location, history);
    } catch (e) {
      console.error('Failed to update browser globals:', e);
    }
  }

  /**
   * Set the page title and update window title bar
   */
  setPageTitle(title: string): void {
    this.pageTitle = title;
    this.updateWindowTitle();
  }

  /**
   * Update the window title bar
   */
  private updateWindowTitle(): void {
    const fullTitle = this.pageTitle
      ? `${this.pageTitle} - ${this.baseTitle}`
      : this.baseTitle;

    this.window.setTitle(fullTitle);
  }

  /**
   * Set the status bar text
   */
  setStatus(status: string): void {
    this.statusText = status;
    // Don't call updateUI() here - status will be reflected on next render
    // Calling updateUI() here would cause infinite loop if page calls setStatus() during load
  }

  /**
   * Fetch page code from a URL
   */
  private async fetchPage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.get(url, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            resolve(this.fetchPage(redirectUrl));
            return;
          }
        }

        // Handle errors
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Store request so it can be cancelled
      this.currentRequest = req;
    });
  }

  /**
   * Render a page from its code into the browser window
   */
  private async renderPage(pageCode: string): Promise<void> {
    // Reset page title when loading new page
    this.pageTitle = '';
    this.updateWindowTitle();

    // Extract path from URL for logging
    let pagePath = this.currentUrl;
    try {
      const urlObj = new URL(this.currentUrl);
      pagePath = urlObj.pathname;
    } catch {
      // If URL parsing fails, use as-is
    }

    // DEBUG: console.log('renderPage called for path:', pagePath);
    // DEBUG: console.log('Code length:', pageCode.length, 'chars');

    // Create browser context for the page
    const browserContext: BrowserContext = {
      back: () => this.back(),
      forward: () => this.forward(),
      changePage: (url: string) => this.changePage(url),
      reload: () => this.reload(),
      stop: () => this.stop(),
      home: () => this.home(),
      setPageTitle: (title: string) => this.setPageTitle(title),
      setStatus: (status: string) => this.setStatus(status),
      addPageMenu: (menuLabel: string, items: PageMenuItem[]) => this.addPageMenu(menuLabel, items),
      currentUrl: this.currentUrl,
      isLoading: this.loading,
      browser: this
    };

    try {
      //=== DUAL EXECUTION: Discovery Pass ===
      // DEBUG: console.log('[Discovery] Starting resource discovery pass...');
      const { ResourceDiscoveryContext, createDiscoveryAPI } = require('./resource-discovery');
      const discoveryContext = new ResourceDiscoveryContext();
      const discoveryTsyne = createDiscoveryAPI(discoveryContext);

      // Execute page code in discovery context to find resources
      try {
        const discoveryFunction = new Function('browserContext', 'tsyne', pageCode);
        discoveryFunction(browserContext, discoveryTsyne);
      } catch (error) {
        // DEBUG: console.log('[Discovery] Error during discovery (non-fatal):', error);
      }

      const discoveredResources = discoveryContext.getDiscoveredResources();
      // DEBUG: console.log('[Discovery] Found resources:', discoveredResources);

      //=== RESOURCE FETCHING ===
      let resourceMap = new Map<string, string>();
      if (discoveredResources.images.length > 0) {
        // DEBUG: console.log(`[ResourceFetch] Fetching ${discoveredResources.images.length} image(s)...`);
        const { ResourceFetcher } = require('./resource-fetcher');
        const fetcher = new ResourceFetcher();
        resourceMap = await fetcher.fetchResources(discoveredResources.images, this.currentUrl);
        // DEBUG: console.log(`[ResourceFetch] Successfully fetched ${resourceMap.size} resource(s)`);
      }

      //=== REAL EXECUTION: Render Pass ===
      // DEBUG: console.log('[Render] Starting real render pass with resources...');

      // FIX: Don't create a new Context! Update the existing context's resourceMap instead.
      // Creating a new Context clears windowStack/containerStack, breaking widget parent lookups.
      const appContext = this.app.getContext();
      appContext.setResourceMap(resourceMap);

      const tsyne = require('./index');

      // DEBUG: console.log('[Render] Creating page builder...');

      // Create a content builder that executes the page code with resources
      this.currentPageBuilder = () => {
        // DEBUG: console.log('[Render] Executing page builder...');
        // Execute the page code - it will create widgets directly
        const pageFunction = new Function('browserContext', 'tsyne', pageCode);
        pageFunction(browserContext, tsyne);
        // DEBUG: console.log('[Render] Page builder executed');
      };

      // DEBUG: console.log('[Render] Setting window content...');
      // DEBUG: console.log('[Render] currentPageBuilder is:', this.currentPageBuilder !== null ? 'SET' : 'NULL');

      // Re-render the entire window (chrome + new content)
      await this.window.setContent(() => {
        // DEBUG: console.log('[Render] Inside setContent callback - about to call buildWindowContent()');
        this.buildWindowContent();
        // DEBUG: console.log('[Render] buildWindowContent() completed');
      });

      // DEBUG: console.log('[Render] Window content set - setContent() returned');

      // Only call show() on first page load (window needs initial show)
      // After that, window is already shown
      if (!this.firstPageLoaded) {
        // DEBUG: console.log('[Render] Showing window for first time...');
        await this.window.show();
        this.firstPageLoaded = true;
        // DEBUG: console.log('[Render] Window shown');
      }

      // In test mode, wait briefly for widgets to register
      if (this.testMode) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update history entry title if page set a title
      if (this.pageTitle && this.historyIndex >= 0) {
        const entry = this.history[this.historyIndex];
        if (entry && entry.title !== this.pageTitle) {
          entry.title = this.pageTitle;
          this.saveHistory();
        }
      }

      // DEBUG: console.log('[Render] renderPage completed successfully');
    } catch (error) {
      console.error('[Error] Error in renderPage:', error);
      await this.showError(this.currentUrl, error);
    }
  }

  /**
   * Show error page in the content area
   */
  private async showError(url: string, error: Error | unknown): Promise<void> {
    // Create error content builder
    this.currentPageBuilder = () => {
      const { vbox, label, button } = require('./index');

      vbox(() => {
        label('Error Loading Page');
        label('');
        label(`URL: ${url}`);
        label(`Error: ${error instanceof Error ? error.message : String(error)}`);
        label('');

        if (this.historyIndex > 0) {
          button('Go Back', () => {
            this.back().catch(err => console.error('Back failed:', err));
          });
        }
      });
    };

    // Re-render window with error content
    await this.window.setContent(() => {
      this.buildWindowContent();
    });

    // Only call show() on first page load (window needs initial show)
    // After that, window is already shown
    if (!this.firstPageLoaded) {
      await this.window.show();
      this.firstPageLoaded = true;
    }

    // In test mode, wait briefly for widgets to register
    if (this.testMode) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Save browsing history to disk
   */
  private saveHistory(): void {
    try {
      // Ensure the .tsyne directory exists
      const dir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save history as JSON
      const historyData = {
        history: this.history,
        historyIndex: this.historyIndex
      };

      fs.writeFileSync(this.historyFilePath, JSON.stringify(historyData, null, 2), 'utf8');
      // DEBUG: console.log('History saved to:', this.historyFilePath);
    } catch (error) {
      console.error('Failed to save history:', error);
      // Don't throw - history persistence failure shouldn't crash browser
    }
  }

  /**
   * Load browsing history from disk
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const data = fs.readFileSync(this.historyFilePath, 'utf8');
        const historyData = JSON.parse(data);

        if (historyData.history && Array.isArray(historyData.history)) {
          this.history = historyData.history;
          this.historyIndex = historyData.historyIndex || -1;
          // DEBUG: console.log('History loaded from disk:', this.history.length, 'entries');
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      // Don't throw - just start with empty history
      this.history = [];
      this.historyIndex = -1;
    }
  }

  /**
   * Clear browsing history
   */
  async clearHistory(): Promise<void> {
    try {
      // Clear in-memory history
      this.history = [];
      this.historyIndex = -1;

      // Delete history file from disk
      if (fs.existsSync(this.historyFilePath)) {
        fs.unlinkSync(this.historyFilePath);
        // DEBUG: console.log('History file deleted:', this.historyFilePath);
      }

      // Update status
      this.statusText = 'History cleared';
      // DEBUG: console.log('Browser history cleared');

      // Update menu bar to reflect empty history (disable back/forward)
      await this.setupMenuBar();
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.statusText = 'Error clearing history';
      // Don't throw - just log the error
    }
  }

  /**
   * Add a bookmark for the current page
   */
  async addBookmark(title?: string): Promise<void> {
    if (!this.currentUrl) {
      // DEBUG: console.log('No current page to bookmark');
      return;
    }

    // Check if already bookmarked
    if (this.isBookmarked(this.currentUrl)) {
      // DEBUG: console.log('Page already bookmarked:', this.currentUrl);
      this.statusText = 'Page already bookmarked';
      return;
    }

    // Use provided title, or page title, or fallback to URL
    const bookmarkTitle = title || this.pageTitle || this.currentUrl;

    const bookmark: Bookmark = {
      title: bookmarkTitle,
      url: this.currentUrl,
      addedAt: Date.now()
    };

    this.bookmarks.push(bookmark);
    this.saveBookmarks();

    this.statusText = `Bookmarked: ${bookmarkTitle}`;
    // DEBUG: console.log('Added bookmark:', bookmark);

    // Update menu bar to include new bookmark
    await this.setupMenuBar();
  }

  /**
   * Remove a bookmark by URL
   */
  async removeBookmark(url: string): Promise<void> {
    const initialLength = this.bookmarks.length;
    this.bookmarks = this.bookmarks.filter(b => b.url !== url);

    if (this.bookmarks.length < initialLength) {
      this.saveBookmarks();
      this.statusText = 'Bookmark removed';
      // DEBUG: console.log('Removed bookmark:', url);

      // Update menu bar to reflect removed bookmark
      await this.setupMenuBar();
    } else {
      // DEBUG: console.log('Bookmark not found:', url);
    }
  }

  /**
   * Check if a URL is bookmarked
   */
  isBookmarked(url: string): boolean {
    return this.bookmarks.some(b => b.url === url);
  }

  /**
   * Get all bookmarks
   */
  getBookmarks(): Bookmark[] {
    return this.bookmarks;
  }

  /**
   * Load bookmarks from disk
   */
  private loadBookmarks(): void {
    try {
      if (fs.existsSync(this.bookmarksFilePath)) {
        const data = fs.readFileSync(this.bookmarksFilePath, 'utf8');
        const bookmarksData = JSON.parse(data);

        if (bookmarksData.bookmarks && Array.isArray(bookmarksData.bookmarks)) {
          this.bookmarks = bookmarksData.bookmarks;
          // DEBUG: console.log('Bookmarks loaded from disk:', this.bookmarks.length, 'entries');
        }
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      // Don't throw - just start with empty bookmarks
      this.bookmarks = [];
    }
  }

  /**
   * Save bookmarks to disk
   */
  private saveBookmarks(): void {
    try {
      // Ensure the .tsyne directory exists
      const dir = path.dirname(this.bookmarksFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save bookmarks as JSON
      const bookmarksData = {
        bookmarks: this.bookmarks
      };

      fs.writeFileSync(this.bookmarksFilePath, JSON.stringify(bookmarksData, null, 2), 'utf8');
      // DEBUG: console.log('Bookmarks saved to:', this.bookmarksFilePath);
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
      // Don't throw - bookmark persistence failure shouldn't crash browser
    }
  }

  /**
   * Export bookmarks to a file
   * @param filePath Path to export file (defaults to bookmarks-export.json in current directory)
   */
  async exportBookmarks(filePath?: string): Promise<void> {
    try {
      const exportPath = filePath || path.join(process.cwd(), 'bookmarks-export.json');

      // Create export data with metadata
      const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        exportedFrom: 'Tsyne Browser',
        bookmarks: this.bookmarks
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
      // DEBUG: console.log('Bookmarks exported to:', exportPath);
      this.statusText = `Exported ${this.bookmarks.length} bookmark(s) to ${path.basename(exportPath)}`;

      await this.window.showInfo(
        'Export Bookmarks',
        `Successfully exported ${this.bookmarks.length} bookmark(s) to:\n${exportPath}`
      );
    } catch (error) {
      console.error('Failed to export bookmarks:', error);
      this.statusText = 'Error exporting bookmarks';
      await this.window.showError(
        'Export Failed',
        `Failed to export bookmarks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Import bookmarks from a file
   * @param filePath Path to import file
   * @param merge If true, merge with existing bookmarks; if false, replace all bookmarks
   */
  async importBookmarks(filePath: string, merge: boolean = true): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(data);

      // Validate import data format
      if (!importData.bookmarks || !Array.isArray(importData.bookmarks)) {
        throw new Error('Invalid bookmark file format: missing bookmarks array');
      }

      const importedBookmarks: Bookmark[] = importData.bookmarks;

      // Validate each bookmark has required fields
      for (const bookmark of importedBookmarks) {
        if (!bookmark.url || !bookmark.title) {
          throw new Error('Invalid bookmark format: each bookmark must have url and title');
        }
      }

      let addedCount = 0;

      if (merge) {
        // Merge mode: add bookmarks that don't already exist (based on URL)
        const existingUrls = new Set(this.bookmarks.map(b => b.url));

        for (const bookmark of importedBookmarks) {
          if (!existingUrls.has(bookmark.url)) {
            this.bookmarks.push({
              title: bookmark.title,
              url: bookmark.url,
              addedAt: Date.now()  // Use current timestamp for imported bookmarks
            });
            addedCount++;
          }
        }
      } else {
        // Replace mode: clear existing bookmarks and use imported ones
        this.bookmarks = importedBookmarks.map(b => ({
          title: b.title,
          url: b.url,
          addedAt: b.addedAt || Date.now()
        }));
        addedCount = this.bookmarks.length;
      }

      this.saveBookmarks();
      // DEBUG: console.log(`Imported ${addedCount} bookmark(s) from:`, filePath);
      this.statusText = `Imported ${addedCount} bookmark(s)`;

      await this.window.showInfo(
        'Import Bookmarks',
        `Successfully imported ${addedCount} bookmark(s) from:\n${filePath}\n\n` +
        `Mode: ${merge ? 'Merge (added new bookmarks)' : 'Replace (replaced all bookmarks)'}`
      );

      // Update menu bar to show new bookmarks
      await this.setupMenuBar();
    } catch (error) {
      console.error('Failed to import bookmarks:', error);
      this.statusText = 'Error importing bookmarks';
      await this.window.showError(
        'Import Failed',
        `Failed to import bookmarks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find text in current page
   * @param query Search query
   * @param caseSensitive Whether search should be case-sensitive
   * @returns Number of matches found
   */
  findInPage(query: string, caseSensitive: boolean = false): number {
    if (!query || query.trim().length === 0) {
      this.clearFind();
      return 0;
    }

    this.findQuery = query;
    this.findMatches = [];
    this.findCurrentIndex = -1;

    // Get current page code
    if (this.historyIndex < 0 || this.historyIndex >= this.history.length) {
      // DEBUG: console.log('No page loaded for find');
      return 0;
    }

    const entry = this.history[this.historyIndex];
    const pageCode = entry.pageCode;

    // Search for all matches
    const searchText = caseSensitive ? pageCode : pageCode.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    let index = 0;
    while (index < searchText.length) {
      const foundIndex = searchText.indexOf(searchQuery, index);
      if (foundIndex === -1) {
        break;
      }
      this.findMatches.push(foundIndex);
      index = foundIndex + 1;
    }

    // Set current index to first match if any found
    if (this.findMatches.length > 0) {
      this.findCurrentIndex = 0;
    }

    const matchText = this.findMatches.length === 1 ? 'match' : 'matches';
    this.statusText = `Found ${this.findMatches.length} ${matchText} for "${query}"`;
    // DEBUG: console.log(`Find in page: "${query}" - ${this.findMatches.length} matches`);

    return this.findMatches.length;
  }

  /**
   * Move to next match in find results
   * @returns True if moved to next match, false if no next match
   */
  findNext(): boolean {
    if (this.findMatches.length === 0) {
      // DEBUG: console.log('No find results to navigate');
      return false;
    }

    if (this.findCurrentIndex < this.findMatches.length - 1) {
      this.findCurrentIndex++;
      this.statusText = `Match ${this.findCurrentIndex + 1} of ${this.findMatches.length}`;
      // DEBUG: console.log(`Find next: ${this.findCurrentIndex + 1}/${this.findMatches.length}`);
      return true;
    } else {
      // Wrap to first match
      this.findCurrentIndex = 0;
      this.statusText = `Match ${this.findCurrentIndex + 1} of ${this.findMatches.length} (wrapped)`;
      // DEBUG: console.log(`Find next: wrapped to first match`);
      return true;
    }
  }

  /**
   * Move to previous match in find results
   * @returns True if moved to previous match, false if no previous match
   */
  findPrevious(): boolean {
    if (this.findMatches.length === 0) {
      // DEBUG: console.log('No find results to navigate');
      return false;
    }

    if (this.findCurrentIndex > 0) {
      this.findCurrentIndex--;
      this.statusText = `Match ${this.findCurrentIndex + 1} of ${this.findMatches.length}`;
      // DEBUG: console.log(`Find previous: ${this.findCurrentIndex + 1}/${this.findMatches.length}`);
      return true;
    } else {
      // Wrap to last match
      this.findCurrentIndex = this.findMatches.length - 1;
      this.statusText = `Match ${this.findCurrentIndex + 1} of ${this.findMatches.length} (wrapped)`;
      // DEBUG: console.log(`Find previous: wrapped to last match`);
      return true;
    }
  }

  /**
   * Clear find state
   */
  clearFind(): void {
    this.findQuery = '';
    this.findMatches = [];
    this.findCurrentIndex = -1;
    this.statusText = 'Find cleared';
    // DEBUG: console.log('Find cleared');
  }

  /**
   * Get current find query (for testing)
   */
  getFindQuery(): string {
    return this.findQuery;
  }

  /**
   * Get find matches count (for testing)
   */
  getFindMatchesCount(): number {
    return this.findMatches.length;
  }

  /**
   * Get current find match index (for testing)
   */
  getFindCurrentIndex(): number {
    return this.findCurrentIndex;
  }

  /**
   * Get formatted history for display
   * @returns Array of formatted history strings with date/time
   */
  getFormattedHistory(): string[] {
    return this.history.map((entry, index) => {
      const title = entry.title || entry.url;
      const timestamp = entry.visitedAt ? new Date(entry.visitedAt).toLocaleString() : 'Unknown date';
      const isCurrent = index === this.historyIndex ? ' (current)' : '';
      return `[${index}] ${title} - ${timestamp}${isCurrent}`;
    });
  }

  /**
   * Show browsing history in console
   */
  showHistory(): void {
    // DEBUG: console.log('\n========== Browsing History ==========');
    // DEBUG: console.log(`Total entries: ${this.history.length}`);
    // DEBUG: console.log(`Current index: ${this.historyIndex}`);
    // DEBUG: console.log('======================================');

    if (this.history.length === 0) {
      // DEBUG: console.log('(No history)');
    } else {
      const formatted = this.getFormattedHistory();
      formatted.forEach(line => console.log(line));
    }

    // DEBUG: console.log('======================================\n');
  }

  /**
   * Start the browser and show the window
   */
  async run(): Promise<void> {
    await this.app.run();
  }

  /**
   * Get the App instance
   */
  getApp(): App {
    return this.app;
  }

  /**
   * Get the browser Window instance
   */
  getWindow(): Window {
    return this.window;
  }

  /**
   * Get browsing history (for testing)
   */
  getHistory(): HistoryEntry[] {
    return this.history;
  }

  /**
   * Get current history index (for testing)
   */
  getHistoryIndex(): number {
    return this.historyIndex;
  }

  /**
   * Check if browser can go back (for testing)
   */
  canGoBack(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Check if browser can go forward (for testing)
   */
  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Get status text (for testing)
   */
  getStatusText(): string {
    return this.statusText;
  }
}

/**
 * Create a browser and navigate to initial URL
 */
export async function createBrowser(
  initialUrl?: string,
  options?: { title?: string; width?: number; height?: number; homeUrl?: string }
): Promise<Browser> {
  const browser = new Browser(options);

  if (initialUrl) {
    await browser.changePage(initialUrl);
  }

  return browser;
}
