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
import { URL } from 'url';
import { App } from './app';
import { Window } from './window';
import { Entry } from './widgets';

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
  private loadingLabel: any = null;
  private stopButton: any = null;
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private currentUrl: string = '';
  private loading: boolean = false;
  private currentRequest: any = null;
  private currentPageBuilder: (() => void) | null = null;
  private pageMenus: Map<string, PageMenuItem[]> = new Map();
  private testMode: boolean = false;
  private firstPageLoaded: boolean = false;

  constructor(options?: { title?: string; width?: number; height?: number; testMode?: boolean }) {
    this.testMode = options?.testMode || false;
    this.app = new App({ title: options?.title || 'Tsyne Browser' }, this.testMode);

    // Set global context for the browser's app so global API calls work
    const { __setGlobalContext } = require('./index');
    __setGlobalContext(this.app, (this.app as any).ctx);

    // Create ONE persistent browser window
    this.window = this.app.window(
      {
        title: options?.title || 'Tsyne Browser',
        width: options?.width || 900,
        height: options?.height || 700
      },
      (win) => {
        this.initializeWindow(win);
      }
    );

    // Set up browser menu bar after window is created
    this.setupMenuBar();
  }

  /**
   * Initialize the browser window with chrome and content area
   */
  private async initializeWindow(win: Window): Promise<void> {
    await win.setContent(() => {
      this.buildWindowContent();
    });
  }

  /**
   * Set up the browser menu bar
   */
  private async setupMenuBar(): Promise<void> {
    const menuDefinition: any[] = [
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
            label: 'View Page Source',
            onSelected: async () => {
              if (this.historyIndex >= 0) {
                const entry = this.history[this.historyIndex];
                console.log('\n========== Page Source ==========');
                console.log(`URL: ${entry.url}`);
                console.log('==================================');
                console.log(entry.pageCode);
                console.log('==================================\n');
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
          }
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

    await this.window.setMainMenu(menuDefinition);
  }

  /**
   * Build the complete window content: browser chrome + page content
   */
  private buildWindowContent(): void {
    const { vbox, hbox, button, entry, separator, scroll, label, border } = require('./index');

    // Use border layout at top level: chrome at top, content fills center
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
              this.addressBarEntry = entry(this.currentUrl || 'http://');
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
            if (this.currentPageBuilder) {
              // Render current page content
              this.currentPageBuilder();
            } else {
              // Welcome message when no page loaded
              label('Tsyne Browser');
              label('');
              label('Enter a URL in the address bar and click Go to navigate.');
            }
          });
        });
      }
    });
  }

  /**
   * Navigate to a URL and load the Tsyne page
   */
  async changePage(url: string): Promise<void> {
    console.log('changePage called with URL:', url);

    if (this.loading) {
      console.log('Page already loading, ignoring navigation');
      return;
    }

    // Handle relative URLs - convert to full URL using current URL's origin
    if (url.startsWith('/') && this.currentUrl) {
      try {
        const currentUrlObj = new URL(this.currentUrl);
        const fullUrl = `${currentUrlObj.protocol}//${currentUrlObj.host}${url}`;
        console.log('Converted relative URL to full URL:', fullUrl);
        url = fullUrl;
      } catch (e) {
        console.error('Failed to convert relative URL:', e);
      }
    }

    this.loading = true;
    this.currentUrl = url;
    console.log('Starting navigation to:', url);

    // Update address bar
    if (this.addressBarEntry) {
      this.addressBarEntry.setText(url);
    }

    // Don't call updateUI() here - it would re-render the current page with new callback IDs,
    // breaking the button that was just clicked

    try {
      // Fetch page code from server
      const pageCode = await this.fetchPage(url);

      // Check if loading was cancelled
      if (!this.loading) {
        console.log('Loading cancelled');
        return;
      }

      // Add to history (clear forward history if navigating from middle)
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }

      this.history.push({ url, pageCode });
      this.historyIndex = this.history.length - 1;

      // Render the page
      await this.renderPage(pageCode);

      // Page rendered successfully - stop loading and update menu bar only
      this.loading = false;
      this.currentRequest = null;
      await this.setupMenuBar();  // Update menu bar to reflect new history state
    } catch (error) {
      if (this.loading) {  // Only show error if not stopped
        await this.showError(url, error);
      }
      this.loading = false;
      this.currentRequest = null;
    }
  }

  /**
   * Stop loading current page
   */
  async stop(): Promise<void> {
    if (!this.loading) {
      return;
    }

    console.log('Stopping page load');
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
      console.log('No previous page in history');
      return;
    }

    this.historyIndex--;
    const entry = this.history[this.historyIndex];
    this.currentUrl = entry.url;

    // Update address bar
    if (this.addressBarEntry) {
      this.addressBarEntry.setText(this.currentUrl);
    }

    await this.renderPage(entry.pageCode);
  }

  /**
   * Navigate forward in history
   */
  async forward(): Promise<void> {
    if (this.historyIndex >= this.history.length - 1) {
      console.log('No next page in history');
      return;
    }

    this.historyIndex++;
    const entry = this.history[this.historyIndex];
    this.currentUrl = entry.url;

    // Update address bar
    if (this.addressBarEntry) {
      this.addressBarEntry.setText(this.currentUrl);
    }

    await this.renderPage(entry.pageCode);
  }

  /**
   * Reload current page
   */
  async reload(): Promise<void> {
    if (this.currentUrl && this.historyIndex >= 0) {
      const entry = this.history[this.historyIndex];
      await this.renderPage(entry.pageCode);
    }
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
    console.log('renderPage called with code length:', pageCode.length);
    console.log('First 200 chars of page code:', pageCode.substring(0, 200));

    // Create browser context for the page
    const browserContext: BrowserContext = {
      back: () => this.back(),
      forward: () => this.forward(),
      changePage: (url: string) => this.changePage(url),
      reload: () => this.reload(),
      stop: () => this.stop(),
      addPageMenu: (menuLabel: string, items: PageMenuItem[]) => this.addPageMenu(menuLabel, items),
      currentUrl: this.currentUrl,
      isLoading: this.loading,
      browser: this
    };

    try {
      // Pages are now simple content builders - just execute the code
      // The page code directly builds widgets using tsyne API
      const tsyne = require('./index');

      console.log('Creating page builder...');

      // Create a content builder that executes the page code
      this.currentPageBuilder = () => {
        console.log('Executing page builder...');
        // Execute the page code - it will create widgets directly
        const pageFunction = new Function('browserContext', 'tsyne', pageCode);
        pageFunction(browserContext, tsyne);
        console.log('Page builder executed');
      };

      console.log('Setting window content...');

      // Re-render the entire window (chrome + new content)
      await this.window.setContent(() => {
        this.buildWindowContent();
      });

      console.log('Window content set');

      // Only call show() on first page load (window needs initial show)
      // After that, window is already shown
      if (!this.firstPageLoaded) {
        console.log('Showing window for first time...');
        await this.window.show();
        this.firstPageLoaded = true;
        console.log('Window shown');
      }

      // In test mode, wait briefly for widgets to register
      if (this.testMode) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('renderPage completed successfully');
    } catch (error) {
      console.error('Error in renderPage:', error);
      await this.showError(this.currentUrl, error);
    }
  }

  /**
   * Show error page in the content area
   */
  private async showError(url: string, error: any): Promise<void> {
    // Create error content builder
    this.currentPageBuilder = () => {
      const { vbox, label, button } = require('./index');

      vbox(() => {
        label('Error Loading Page');
        label('');
        label(`URL: ${url}`);
        label(`Error: ${error.message || error}`);
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
}

/**
 * Create a browser and navigate to initial URL
 */
export async function createBrowser(
  initialUrl?: string,
  options?: { title?: string; width?: number; height?: number }
): Promise<Browser> {
  const browser = new Browser(options);

  if (initialUrl) {
    await browser.changePage(initialUrl);
  }

  return browser;
}
