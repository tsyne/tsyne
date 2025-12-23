// @tsyne-app:name LitProg
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
// @tsyne-app:category development
// @tsyne-app:builder createLitProgApp

/**
 * LitProg - Literate Programming Editor for Tsyne
 *
 * A literate programming tool that supports three syntax styles:
 * - Noweb (Classic): <<chunk-name>>= ... @
 * - Org-Mode (Emacs): #+BEGIN_SRC ... #+END_SRC
 * - Markdown Fences: ```lang {#name .tangle=file} ... ```
 *
 * Features:
 * - Live preview of tangled code and woven documentation
 * - Chunk navigation and reference tracking
 * - Multiple output format support
 *
 * Inspired by ChrysaLisp litprog.lisp (PR #301)
 */

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets';
import type { MultiLineEntry } from '../../core/src/widgets';
import type { Select } from '../../core/src/widgets';
import { LitProgStore } from './store';
import { SyntaxStyle, WeaveFormat } from './parser';
import * as fs from 'fs';
import * as path from 'path';

export interface LitProgUI {
  getStore(): LitProgStore;
  refreshPreview(): void;
  openFile(filePath?: string): Promise<void>;
  saveFile(filePath?: string): Promise<void>;
  newDocument(style?: SyntaxStyle): void;
}

/**
 * Create the LitProg literate programming editor
 * @param a App instance
 * @returns UI controller interface
 */
export function createLitProgApp(a: App): LitProgUI {
  const store = new LitProgStore(LitProgStore.getTemplate('markdown'));

  // Widget references for incremental updates
  let editorEntry: MultiLineEntry | null = null;
  let previewTangleLabel: Label | null = null;
  let previewWeaveLabel: Label | null = null;
  let chunkListLabel: Label | null = null;
  let statsLabel: Label | null = null;
  let errorsLabel: Label | null = null;
  let titleLabel: Label | null = null;
  let currentChunkLabel: Label | null = null;
  let chunkContentLabel: Label | null = null;
  let mainWindow: Window | null = null;
  let syntaxSelect: Select | null = null;
  let weaveFormatSelect: Select | null = null;
  let previewMode: 'tangle' | 'weave' | 'chunks' = 'tangle';

  /**
   * Update window title to show file name and modified state
   */
  function updateWindowTitle(): void {
    if (!mainWindow) return;

    let title = 'LitProg';
    const filePath = store.getFilePath();
    if (filePath) {
      title += ` - ${path.basename(filePath)}`;
    }
    if (store.isDirty()) {
      title += ' *';
    }
    mainWindow.setTitle(title);
  }

  /**
   * Refresh all preview elements
   */
  function refreshPreview(): void {
    // Update title
    if (titleLabel) {
      titleLabel.setText(store.getTitle());
    }

    // Update stats
    const stats = store.getStats();
    if (statsLabel) {
      statsLabel.setText(
        `Chunks: ${stats.uniqueChunks} | Code lines: ${stats.totalCodeLines} | Docs: ${stats.documentationSections} | Files: ${stats.filesGenerated}`
      );
    }

    // Update errors
    const errors = store.getErrors();
    if (errorsLabel) {
      if (errors.length === 0) {
        errorsLabel.setText('No errors');
        errorsLabel.show();
      } else {
        const errorTexts = errors.map((e) => `Line ${e.line}: ${e.message}`);
        errorsLabel.setText(errorTexts.join('\n'));
        errorsLabel.show();
      }
    }

    // Update chunk list
    const chunkNames = store.getChunkNames();
    if (chunkListLabel) {
      if (chunkNames.length === 0) {
        chunkListLabel.setText('No chunks defined');
      } else {
        const currentIndex = store.getCurrentChunkIndex();
        const listText = chunkNames
          .map((name, i) => (i === currentIndex ? `> ${name}` : `  ${name}`))
          .join('\n');
        chunkListLabel.setText(listText);
      }
    }

    // Update current chunk info
    const currentChunks = store.getCurrentChunk();
    if (currentChunkLabel) {
      const name = store.getCurrentChunkName();
      if (name && currentChunks) {
        currentChunkLabel.setText(
          `<<${name}>> (${currentChunks[0].language}, ${currentChunks.length} definition(s))`
        );
      } else {
        currentChunkLabel.setText('No chunk selected');
      }
    }

    // Update chunk content preview
    if (chunkContentLabel && currentChunks) {
      const content = currentChunks.map((c) => c.content.join('\n')).join('\n---\n');
      chunkContentLabel.setText(content || '(empty)');
    }

    // Update preview based on mode
    switch (previewMode) {
      case 'tangle':
        if (previewTangleLabel) {
          previewTangleLabel.setText(store.getTangledPreview() || '(no tangled output)');
          previewTangleLabel.show();
        }
        if (previewWeaveLabel) {
          previewWeaveLabel.hide();
        }
        break;
      case 'weave':
        if (previewWeaveLabel) {
          previewWeaveLabel.setText(store.weave() || '(no woven output)');
          previewWeaveLabel.show();
        }
        if (previewTangleLabel) {
          previewTangleLabel.hide();
        }
        break;
    }

    updateWindowTitle();
  }

  /**
   * Open a file
   */
  async function openFile(filePath?: string): Promise<void> {
    if (!mainWindow) return;

    // Check for unsaved changes
    if (store.isDirty()) {
      const save = await mainWindow.showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before opening a new file?'
      );
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
      store.setSource(content);
      store.markSaved(targetPath);
      if (editorEntry) {
        editorEntry.setText(content);
      }
      refreshPreview();
    } catch (e) {
      await mainWindow.showError('Error', `Failed to open file: ${e}`);
    }
  }

  /**
   * Save to a file
   */
  async function saveFile(filePath?: string): Promise<void> {
    if (!mainWindow) return;

    let targetPath = filePath || store.getFilePath();

    // If no path, show save dialog
    if (!targetPath) {
      const selected = await mainWindow.showFileSave('document.lit');
      if (!selected) return;
      targetPath = selected;
    }

    try {
      const content = store.getSource();
      fs.writeFileSync(targetPath, content, 'utf-8');
      store.markSaved(targetPath);
      refreshPreview();
    } catch (e) {
      await mainWindow.showError('Error', `Failed to save file: ${e}`);
    }
  }

  /**
   * Export tangled code
   */
  async function exportTangled(): Promise<void> {
    if (!mainWindow) return;

    const folder = await mainWindow.showFolderOpen();
    if (!folder) return;

    try {
      const files = store.tangle();
      for (const [filename, content] of files) {
        const fullPath = path.join(folder, filename);
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
      await mainWindow.showInfo(
        'Export Complete',
        `Exported ${files.size} file(s) to:\n${folder}`
      );
    } catch (e) {
      await mainWindow.showError('Error', `Failed to export: ${e}`);
    }
  }

  /**
   * Export woven documentation
   */
  async function exportWoven(): Promise<void> {
    if (!mainWindow) return;

    const format = store.getWeaveFormat();
    const extensions: Record<WeaveFormat, string> = {
      markdown: 'md',
      html: 'html',
      latex: 'tex',
      text: 'txt',
    };

    const defaultName = `${store.getTitle().replace(/\s+/g, '_')}.${extensions[format]}`;
    const selected = await mainWindow.showFileSave(defaultName);
    if (!selected) return;

    try {
      const content = store.weave();
      fs.writeFileSync(selected, content, 'utf-8');
      await mainWindow.showInfo('Export Complete', `Documentation exported to:\n${selected}`);
    } catch (e) {
      await mainWindow.showError('Error', `Failed to export: ${e}`);
    }
  }

  /**
   * Create new document
   */
  function newDocument(style: SyntaxStyle = 'markdown'): void {
    store.setSource(LitProgStore.getTemplate(style));
    if (editorEntry) {
      editorEntry.setText(store.getSource());
    }
    refreshPreview();
  }

  /**
   * Show about dialog
   */
  async function showAbout(): Promise<void> {
    if (!mainWindow) return;

    await mainWindow.showInfo(
      'About LitProg',
      'LitProg v1.0.0\n\n' +
        'A literate programming editor for Tsyne.\n\n' +
        'Inspired by ChrysaLisp litprog.lisp\n\n' +
        'Supported syntax styles:\n' +
        '- Noweb: <<chunk-name>>= ... @\n' +
        '- Org-mode: #+BEGIN_SRC ... #+END_SRC\n' +
        '- Markdown: ```lang {#name .tangle=file} ... ```\n\n' +
        'Features:\n' +
        '- Tangle: Extract executable code\n' +
        '- Weave: Generate documentation\n' +
        '- Chunk navigation and references'
    );
  }

  // ----- Build the UI -----

  a.window(
    { title: 'LitProg - Literate Programming Editor', width: 1400, height: 900 },
    (win) => {
      mainWindow = win;

      // Set main menu
      win.setMainMenu([
        {
          label: 'File',
          items: [
            {
              label: 'New (Markdown)',
              onSelected: () => newDocument('markdown'),
            },
            { label: 'New (Noweb)', onSelected: () => newDocument('noweb') },
            { label: 'New (Org-mode)', onSelected: () => newDocument('orgmode') },
            { label: '', isSeparator: true },
            { label: 'Open...', onSelected: () => openFile() },
            { label: 'Save', onSelected: () => saveFile() },
            { label: 'Save As...', onSelected: () => saveFile(undefined) },
            { label: '', isSeparator: true },
            { label: 'Export Code...', onSelected: () => exportTangled() },
            { label: 'Export Docs...', onSelected: () => exportWoven() },
            { label: '', isSeparator: true },
            { label: 'Exit', onSelected: () => process.exit(0) },
          ],
        },
        {
          label: 'View',
          items: [
            {
              label: 'Tangle Preview',
              onSelected: () => {
                previewMode = 'tangle';
                refreshPreview();
              },
            },
            {
              label: 'Weave Preview',
              onSelected: () => {
                previewMode = 'weave';
                refreshPreview();
              },
            },
          ],
        },
        {
          label: 'Navigate',
          items: [
            {
              label: 'Previous Chunk',
              onSelected: () => {
                store.previousChunk();
              },
            },
            {
              label: 'Next Chunk',
              onSelected: () => {
                store.nextChunk();
              },
            },
          ],
        },
        {
          label: 'Help',
          items: [{ label: 'About', onSelected: () => showAbout() }],
        },
      ]);

      // Close intercept
      win.setCloseIntercept(async () => {
        if (store.isDirty()) {
          const save = await win.showConfirm(
            'Unsaved Changes',
            'You have unsaved changes. Do you want to save before closing?'
          );
          if (save) {
            await saveFile();
          }
        }
        return true;
      });

      win.setContent(() => {
        a.vbox(() => {
          // Toolbar
          a.hbox(() => {
            a.button('New').onClick(() => newDocument('markdown')).withId('btn-new');
            a.button('Open').onClick(() => openFile()).withId('btn-open');
            a.button('Save').onClick(() => saveFile()).withId('btn-save');

            a.separator();

            a.label('Syntax:', undefined, undefined, undefined, undefined).withId('syntax-label');
            const syntaxOptions = ['Auto', 'Noweb', 'Org-mode', 'Markdown'];
            const styles: SyntaxStyle[] = ['auto', 'noweb', 'orgmode', 'markdown'];
            syntaxSelect = a
              .select(syntaxOptions, (selected: string) => {
                const index = syntaxOptions.indexOf(selected);
                if (index >= 0) {
                  store.setSyntaxStyle(styles[index]);
                  refreshPreview();
                }
              })
              .withId('syntax-select');

            a.separator();

            a.label('Output:', undefined, undefined, undefined, undefined).withId('output-label');
            const formatOptions = ['Markdown', 'HTML', 'LaTeX', 'Text'];
            const formats: WeaveFormat[] = ['markdown', 'html', 'latex', 'text'];
            weaveFormatSelect = a
              .select(formatOptions, (selected: string) => {
                const index = formatOptions.indexOf(selected);
                if (index >= 0) {
                  store.setWeaveFormat(formats[index]);
                  refreshPreview();
                }
              })
              .withId('format-select');

            a.separator();

            a.button('Export Code')
              .onClick(() => exportTangled())
              .withId('btn-export-code');
            a.button('Export Docs')
              .onClick(() => exportWoven())
              .withId('btn-export-docs');
          });

          a.separator();

          // Status bar
          a.hbox(() => {
            titleLabel = a.label(store.getTitle(), undefined, undefined, undefined, { bold: true }).withId(
              'title-label'
            );
            a.spacer();
            statsLabel = a
              .label('', undefined, undefined, undefined, undefined)
              .withId('stats-label');
          });

          // Errors (if any)
          errorsLabel = a
            .label('', 'error-label', undefined, 'word', undefined)
            .withId('errors-label');

          a.separator();

          // Main content area - horizontal split
          a.hsplit(
            () => {
              // Left: Editor
              a.vbox(() => {
                a.label('Source', undefined, undefined, undefined, { bold: true }).withId(
                  'source-label'
                );
                a.scroll(() => {
                  editorEntry = a.multilineentry(store.getSource()).withId('editor');
                }).withMinSize(300, 400);
                a.hbox(() => {
                  a.button('Parse').onClick(async () => {
                    if (editorEntry) {
                      const text = await editorEntry.getText();
                      store.setSource(text);
                      refreshPreview();
                    }
                  }).withId('btn-parse');
                });
              });
            },
            () => {
              // Right: Preview split vertically
              a.vsplit(
                () => {
                  // Top: Output preview
                  a.vbox(() => {
                    a.hbox(() => {
                      a.label('Output Preview', undefined, undefined, undefined, { bold: true }).withId(
                        'output-preview-label'
                      );
                      a.spacer();
                      a.button('Tangle').onClick(() => {
                        previewMode = 'tangle';
                        refreshPreview();
                      }).withId('btn-tangle');
                      a.button('Weave').onClick(() => {
                        previewMode = 'weave';
                        refreshPreview();
                      }).withId('btn-weave');
                    });
                    a.scroll(() => {
                      a.vbox(() => {
                        previewTangleLabel = a
                          .label('', undefined, undefined, 'word', undefined)
                          .withId('preview-tangle');
                        previewWeaveLabel = a
                          .label('', undefined, undefined, 'word', undefined)
                          .withId('preview-weave');
                      });
                    }).withMinSize(300, 200);
                  });
                },
                () => {
                  // Bottom: Chunk navigation
                  a.vbox(() => {
                    a.hbox(() => {
                      a.label('Chunks', undefined, undefined, undefined, { bold: true }).withId(
                        'chunks-label'
                      );
                      a.spacer();
                      a.button('Prev').onClick(() => { store.previousChunk(); }).withId('btn-prev-chunk');
                      a.button('Next').onClick(() => { store.nextChunk(); }).withId('btn-next-chunk');
                    });

                    currentChunkLabel = a
                      .label('', undefined, undefined, undefined, undefined)
                      .withId('current-chunk-label');

                    a.hsplit(
                      () => {
                        // Chunk list
                        a.scroll(() => {
                          chunkListLabel = a
                            .label('', undefined, undefined, 'word', undefined)
                            .withId('chunk-list');
                        }).withMinSize(100, 150);
                      },
                      () => {
                        // Chunk content
                        a.scroll(() => {
                          chunkContentLabel = a
                            .label('', undefined, undefined, 'word', undefined)
                            .withId('chunk-content');
                        }).withMinSize(200, 150);
                      },
                      0.3
                    );
                  });
                },
                0.5
              );
            },
            0.4
          );
        });
      });

      // Subscribe to store changes
      store.subscribe(() => {
        refreshPreview();
      });

      // Initial render
      refreshPreview();

      win.show();
    }
  );

  return {
    getStore: () => store,
    refreshPreview,
    openFile,
    saveFile,
    newDocument,
  };
}

// Main entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'LitProg' }, (a) => {
    createLitProgApp(a);
  });
}
