// @tsyne-app:name Slydes
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M12 18v4"/><path d="M8 22h8"/><path d="M7 8h10"/><path d="M7 12h6"/></svg>
// @tsyne-app:category productivity
// @tsyne-app:builder createSlydesApp
// @tsyne-app:args app,windowWidth,windowHeight

/**
 * Slydes - Markdown Presentation App for Tsyne
 *
 * Ported from https://github.com/andydotxyz/slydes
 * Uses incremental UI updates inspired by examples/solitaire
 *
 * Tsyne API features demonstrated:
 * - Main menu with File, View, Help operations
 * - File dialogs for opening/saving presentations
 * - Preferences for recent files
 * - Fullscreen presentation mode
 * - Close intercept for unsaved changes
 * - About dialog
 */

import { app, resolveTransport  } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import type { Label } from 'tsyne';
import type { MultiLineEntry } from 'tsyne';
import type { VBox } from 'tsyne';
import { SlideStore } from './store';
import * as fs from 'fs';
import * as path from 'path';

// Constants for preferences
const PREF_RECENT_COUNT = 'slydes_recent_count';
const PREF_RECENT_PREFIX = 'slydes_recent_';
const MAX_RECENT_FILES = 5;

export interface SlydesUI {
  getStore(): SlideStore;
  refreshPreview(): void;
  showPresentation(): void;
  openFile(filePath?: string): Promise<void>;
  saveFile(filePath?: string): Promise<void>;
  hasUnsavedChanges(): boolean;
}

/**
 * Create the Slydes presentation app
 * @param a App instance
 * @returns UI controller interface
 */
export function createSlydesApp(a: App, windowWidth?: number, windowHeight?: number): SlydesUI {
  const store = new SlideStore('# Slide 1\n\nWelcome to Slydes!\n\n---\n\n# Slide 2\n\nEdit the markdown on the left to create your presentation.');

  // Widget references for incremental updates
  let editorEntry: MultiLineEntry | null = null;
  let previewHeading: Label | null = null;
  let previewSubheading: Label | null = null;
  let previewContent: Label | null = null;
  let slideCountLabel: Label | null = null;
  let currentSlideLabel: Label | null = null;
  let previewContainer: VBox | null = null;
  let mainWindow: Window | null = null;

  // File state
  let currentFilePath: string | null = null;
  let savedMarkdown: string = store.getMarkdown();
  let recentFiles: string[] = [];

  /**
   * Check if there are unsaved changes
   */
  function hasUnsavedChanges(): boolean {
    return store.getMarkdown() !== savedMarkdown;
  }

  /**
   * Load recent files from preferences
   */
  async function loadRecentFiles(): Promise<void> {
    try {
      const count = await a.getPreferenceInt(PREF_RECENT_COUNT, 0);
      recentFiles = [];
      for (let i = 0; i < count && i < MAX_RECENT_FILES; i++) {
        const file = await a.getPreference(`${PREF_RECENT_PREFIX}${i}`, '');
        if (file && fs.existsSync(file)) {
          recentFiles.push(file);
        }
      }
    } catch (e) {
      console.warn('Failed to load recent files:', e);
    }
  }

  /**
   * Save recent files to preferences
   */
  async function saveRecentFiles(): Promise<void> {
    try {
      await a.setPreference(PREF_RECENT_COUNT, recentFiles.length.toString());
      for (let i = 0; i < recentFiles.length; i++) {
        await a.setPreference(`${PREF_RECENT_PREFIX}${i}`, recentFiles[i]);
      }
    } catch (e) {
      console.warn('Failed to save recent files:', e);
    }
  }

  /**
   * Add file to recent files list
   */
  function addToRecentFiles(filePath: string): void {
    // Remove if already exists
    recentFiles = recentFiles.filter(f => f !== filePath);
    // Add to front
    recentFiles.unshift(filePath);
    // Trim to max
    recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
    saveRecentFiles();
  }

  /**
   * Open a file
   */
  async function openFile(filePath?: string): Promise<void> {
    if (!mainWindow) return;

    // Check for unsaved changes
    if (hasUnsavedChanges()) {
      const save = await mainWindow.showConfirm('Unsaved Changes', 'You have unsaved changes. Do you want to save before opening a new file?');
      if (save) {
        await saveFile();
      }
    }

    // Get file path if not provided
    let targetPath = filePath;
    if (!targetPath) {
      const selected = await mainWindow.showFileOpen();
      if (!selected) return;
      targetPath = selected;
    }

    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
      store.setMarkdown(content);
      currentFilePath = targetPath;
      savedMarkdown = content;
      addToRecentFiles(targetPath);
      updateWindowTitle();
    } catch (e) {
      await mainWindow.showError('Error', `Failed to open file: ${e}`);
    }
  }

  /**
   * Save to a file
   */
  async function saveFile(filePath?: string): Promise<void> {
    if (!mainWindow) return;

    let targetPath = filePath || currentFilePath;

    // If no path, show save dialog
    if (!targetPath) {
      const selected = await mainWindow.showFileSave('presentation.md');
      if (!selected) return;
      targetPath = selected;
    }

    try {
      const content = store.getMarkdown();
      fs.writeFileSync(targetPath, content, 'utf-8');
      currentFilePath = targetPath;
      savedMarkdown = content;
      addToRecentFiles(targetPath);
      updateWindowTitle();
    } catch (e) {
      await mainWindow.showError('Error', `Failed to save file: ${e}`);
    }
  }

  /**
   * Save as a new file
   */
  async function saveFileAs(): Promise<void> {
    if (!mainWindow) return;

    const defaultName = currentFilePath ? path.basename(currentFilePath) : 'presentation.md';
    const selected = await mainWindow.showFileSave(defaultName);
    if (!selected) return;

    await saveFile(selected);
  }

  /**
   * Update window title to show file name and modified state
   */
  function updateWindowTitle(): void {
    if (!mainWindow) return;

    let title = 'Slydes';
    if (currentFilePath) {
      title += ` - ${path.basename(currentFilePath)}`;
    }
    if (hasUnsavedChanges()) {
      title += ' *';
    }
    mainWindow.setTitle(title);
  }

  /**
   * Create new presentation
   */
  async function newPresentation(): Promise<void> {
    if (!mainWindow) return;

    if (hasUnsavedChanges()) {
      const save = await mainWindow.showConfirm('Unsaved Changes', 'You have unsaved changes. Do you want to save before creating a new presentation?');
      if (save) {
        await saveFile();
      }
    }

    store.setMarkdown('# New Presentation\n\nEdit me!\n\n---\n\n# Slide 2\n\nAdd your content here.');
    currentFilePath = null;
    savedMarkdown = store.getMarkdown();
    updateWindowTitle();
  }

  /**
   * Show about dialog
   */
  async function showAbout(): Promise<void> {
    if (!mainWindow) return;

    await mainWindow.showInfo(
      'About Slydes',
      'Slydes v1.0.0\n\n' +
      'A markdown-based presentation tool.\n\n' +
      'Ported from github.com/andydotxyz/slydes\n' +
      'Original authors: Fyne.io contributors\n\n' +
      'Features:\n' +
      '• Write slides in markdown format\n' +
      '• Use --- to separate slides\n' +
      '• Fullscreen presentation mode\n' +
      '• Recent files tracking\n' +
      '• Auto-save reminders'
    );
  }

  /**
   * Build the main menu
   */
  function buildMainMenu(win: Window): void {
    const recentFilesMenu = recentFiles.map(filePath => ({
      label: path.basename(filePath),
      onSelected: () => openFile(filePath)
    }));

    win.setMainMenu([
      {
        label: 'File',
        items: [
          { label: 'New', onSelected: () => newPresentation() },
          { label: 'Open...', onSelected: () => openFile() },
          { label: '', isSeparator: true },
          ...(recentFilesMenu.length > 0 ? [
            ...recentFilesMenu,
            { label: '', isSeparator: true }
          ] : []),
          { label: 'Save', onSelected: () => saveFile() },
          { label: 'Save As...', onSelected: () => saveFileAs() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => confirmExit() }
        ]
      },
      {
        label: 'Edit',
        items: [
          { label: 'Add Slide', onSelected: () => addSlide() }
        ]
      },
      {
        label: 'View',
        items: [
          { label: 'Present', onSelected: () => showPresentation() },
          { label: 'Present Fullscreen', onSelected: () => showPresentationFullscreen() }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'About', onSelected: () => showAbout() }
        ]
      }
    ]);
  }

  /**
   * Confirm exit with unsaved changes check
   */
  async function confirmExit(): Promise<void> {
    if (!mainWindow) {
      process.exit(0);
      return;
    }

    if (hasUnsavedChanges()) {
      const save = await mainWindow.showConfirm('Unsaved Changes', 'You have unsaved changes. Do you want to save before exiting?');
      if (save) {
        await saveFile();
      }
    }

    process.exit(0);
  }

  /**
   * Add a new slide
   */
  function addSlide(): void {
    const current = store.getMarkdown();
    const newMarkdown = current + '\n\n---\n\n# New Slide\n';
    store.setMarkdown(newMarkdown);
  }

  /**
   * Refresh the slide preview (incremental update)
   */
  function refreshPreview(): void {
    const slide = store.getCurrentSlide();
    if (!slide) return;

    // Update preview labels (incremental - no rebuild)
    if (previewHeading) {
      previewHeading.setText(slide.heading || '');
      if (slide.heading) {
        previewHeading.show();
      } else {
        previewHeading.hide();
      }
    }

    if (previewSubheading) {
      previewSubheading.setText(slide.subheading || '');
      if (slide.subheading) {
        previewSubheading.show();
      } else {
        previewSubheading.hide();
      }
    }

    if (previewContent) {
      // Strip HTML tags for simple text display
      const textContent = slide.content.replace(/<[^>]*>/g, '');
      previewContent.setText(textContent || '');
    }

    // Update status labels
    if (slideCountLabel) {
      slideCountLabel.setText(`${store.getSlideCount()} slides`);
    }

    if (currentSlideLabel) {
      currentSlideLabel.setText(`Slide ${store.getCurrentIndex() + 1} of ${store.getSlideCount()}`);
    }

    // Update editor if needed
    if (editorEntry) {
      editorEntry.setText(store.getMarkdown());
    }
  }

  /**
   * Open presentation mode in a new window
   * @param fullscreen Whether to open in fullscreen mode
   */
  function showPresentation(fullscreen: boolean = false): void {
    a.window({ title: 'Slydes - Presentation', width: 1024, height: 768 }, (presentWin) => {
      let presentHeading: Label | null = null;
      let presentSubheading: Label | null = null;
      let presentContent: Label | null = null;
      let statusLabel: Label | null = null;

      function refreshPresentationSlide(): void {
        const slide = store.getCurrentSlide();
        if (!slide) return;

        if (presentHeading) {
          presentHeading.setText(slide.heading || '');
          if (slide.heading) {
            presentHeading.show();
          } else {
            presentHeading.hide();
          }
        }

        if (presentSubheading) {
          presentSubheading.setText(slide.subheading || '');
          if (slide.subheading) {
            presentSubheading.show();
          } else {
            presentSubheading.hide();
          }
        }

        if (presentContent) {
          const textContent = slide.content.replace(/<[^>]*>/g, '');
          presentContent.setText(textContent || '');
        }

        if (statusLabel) {
          statusLabel.setText(`${store.getCurrentIndex() + 1} / ${store.getSlideCount()}`);
        }
      }

      presentWin.setContent(() => {
        a.vbox(() => {
          // Title area
          a.center(() => {
            a.vbox(() => {
              presentHeading = a.label('', undefined, 'center', undefined, { bold: true }).withId('presentation-heading');
              presentSubheading = a.label('', undefined, 'center', undefined, { bold: true }).withId('presentation-subheading');
            });
          });

          a.separator();

          // Content area
          a.scroll(() => {
            a.center(() => {
              presentContent = a.label('', undefined, 'center', 'word', undefined).withId('presentation-content');
            });
          });

          a.separator();

          // Navigation controls
          a.hbox(() => {
            a.button('Previous').onClick(() => {
              if (store.previousSlide()) {
                refreshPresentationSlide();
              }
            }).withId('btn-prev');

            statusLabel = a.label(`1 / ${store.getSlideCount()}`, undefined, undefined, undefined, undefined).withId('presentation-status');

            a.button('Next').onClick(() => {
              if (store.nextSlide()) {
                refreshPresentationSlide();
              }
            }).withId('btn-next');

            if (fullscreen) {
              a.button('Exit Fullscreen').onClick(() => {
                presentWin.setFullScreen(false);
              }).withId('btn-exit-fullscreen');
            } else {
              a.button('Fullscreen').onClick(() => {
                presentWin.setFullScreen(true);
              }).withId('btn-fullscreen');
            }

            a.button('Close').onClick(() => {
              presentWin.close();
            }).withId('btn-close-presentation');
          });
        });
      });

      // Initial render
      refreshPresentationSlide();

      presentWin.show();

      // Enter fullscreen if requested
      if (fullscreen) {
        presentWin.setFullScreen(true);
      }
    });
  }

  /**
   * Show presentation in fullscreen mode
   */
  function showPresentationFullscreen(): void {
    showPresentation(true);
  }

  /**
   * Build the content UI
   */
  const buildContent = () => {
      a.vbox(() => {
        // Toolbar
        a.hbox(() => {
          a.button('New').onClick(() => {
            newPresentation();
          }).withId('btn-new');

          a.button('Open').onClick(() => {
            openFile();
          }).withId('btn-open');

          a.button('Save').onClick(() => {
            saveFile();
          }).withId('btn-save');

          a.separator();

          a.button('Add Slide').onClick(() => {
            addSlide();
          }).withId('btn-add-slide');

          a.separator();

          a.button('Present').onClick(() => {
            showPresentation();
          }).withId('btn-present');

          a.button('Fullscreen').onClick(() => {
            showPresentationFullscreen();
          }).withId('btn-present-fullscreen');

          a.separator();

          slideCountLabel = a.label(`${store.getSlideCount()} slides`, undefined, undefined, undefined, undefined).withId('slide-count');
        });

        a.separator();

        // Main split view
        a.hsplit(() => {
          // Left: Markdown editor
          a.vbox(() => {
            a.label('Markdown Editor', undefined, undefined, undefined, undefined).withId('editor-label');
            editorEntry = a.multilineentry(store.getMarkdown()).withId('editor');
          });
        }, () => {
          // Right: Preview
          a.vbox(() => {
            a.hbox(() => {
              a.label('Preview', undefined, undefined, undefined, undefined).withId('preview-label');
              currentSlideLabel = a.label(`Slide 1 of ${store.getSlideCount()}`, undefined, undefined, undefined, undefined).withId('current-slide');
            });

            a.separator();

            // Navigation in preview
            a.hbox(() => {
              a.button('◀ Prev').onClick(() => {
                store.previousSlide();
              }).withId('preview-prev');

              a.button('Next ▶').onClick(() => {
                store.nextSlide();
              }).withId('preview-next');
            });

            a.separator();

            // Preview content
            a.scroll(() => {
              previewContainer = a.vbox(() => {
                previewHeading = a.label('', undefined, 'center', undefined, { bold: true }).withId('preview-heading');
                previewSubheading = a.label('', undefined, 'center', undefined, { bold: true }).withId('preview-subheading');
                a.separator();
                previewContent = a.label('', undefined, undefined, 'word', undefined).withId('preview-content');
              });
            });
          });
        }, 0.35);
    });
  };

  // Subscribe to store changes for reactive updates
  store.subscribe(() => {
    refreshPreview();
    updateWindowTitle();
  });

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  a.window({ title: 'Slydes - Markdown Presentation Editor', width: 1200, height: 800 }, (win) => {
    mainWindow = win;

    buildMainMenu(win);

    loadRecentFiles().then(() => {
      buildMainMenu(win);
    }).catch(err => {
      console.error('Failed to load recent files:', err);
    });

    win.setCloseIntercept(async () => {
      if (hasUnsavedChanges()) {
        const save = await win.showConfirm('Unsaved Changes', 'You have unsaved changes. Do you want to save before closing?');
        if (save) {
          await saveFile();
        }
      }
      return true;
    });

    win.setContent(buildContent);
    refreshPreview();
    win.show();
  });

  return {
    getStore: () => store,
    refreshPreview,
    showPresentation: () => showPresentation(false),
    openFile,
    saveFile,
    hasUnsavedChanges,
  };
}

// Main entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Slydes' }, (a) => {
    createSlydesApp(a);
  });
}
