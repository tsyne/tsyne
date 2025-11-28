/**
 * Slydes - Markdown Presentation App for Tsyne
 *
 * Ported from https://github.com/andydotxyz/slydes
 * Uses incremental UI updates inspired by examples/solitaire
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import type { Label } from '../../src/widgets';
import type { MultiLineEntry } from '../../src/widgets';
import type { VBox } from '../../src/widgets';
import { SlideStore } from './store';

export interface SlydesUI {
  getStore(): SlideStore;
  refreshPreview(): void;
  showPresentation(): void;
}

/**
 * Create the Slydes presentation app
 * @param a App instance
 * @returns UI controller interface
 */
export function createSlydesApp(a: App): SlydesUI {
  const store = new SlideStore('# Slide 1\n\nWelcome to Slydes!\n\n---\n\n# Slide 2\n\nEdit the markdown on the left to create your presentation.');

  // Widget references for incremental updates
  let editorEntry: MultiLineEntry | null = null;
  let previewHeading: Label | null = null;
  let previewSubheading: Label | null = null;
  let previewContent: Label | null = null;
  let slideCountLabel: Label | null = null;
  let currentSlideLabel: Label | null = null;
  let previewContainer: VBox | null = null;

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
   */
  function showPresentation(): void {
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
              presentHeading = a.label('', undefined, undefined, undefined, undefined).withId('presentation-heading');
              presentSubheading = a.label('', undefined, undefined, undefined, undefined).withId('presentation-subheading');
            });
          });

          a.separator();

          // Content area
          a.scroll(() => {
            a.center(() => {
              presentContent = a.label('', undefined, undefined, undefined, undefined).withId('presentation-content');
            });
          });

          a.separator();

          // Navigation controls
          a.hbox(() => {
            a.button('Previous', () => {
              if (store.previousSlide()) {
                refreshPresentationSlide();
              }
            }).withId('btn-prev');

            statusLabel = a.label(`1 / ${store.getSlideCount()}`, undefined, undefined, undefined, undefined).withId('presentation-status');

            a.button('Next', () => {
              if (store.nextSlide()) {
                refreshPresentationSlide();
              }
            }).withId('btn-next');
          });
        });
      });

      // Initial render
      refreshPresentationSlide();

      presentWin.show();
    });
  }

  /**
   * Build the main editor UI
   */
  a.window({ title: 'Slydes - Markdown Presentation Editor', width: 1200, height: 800 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Toolbar
        a.hbox(() => {
          a.button('New', () => {
            store.setMarkdown('# New Presentation\n\nEdit me!\n\n---\n\n# Slide 2\n');
          }).withId('btn-new');

          a.button('Add Slide', () => {
            const current = store.getMarkdown();
            const newMarkdown = current + '\n\n---\n\n# New Slide\n';
            store.setMarkdown(newMarkdown);
          }).withId('btn-add-slide');

          a.separator();

          a.button('Present', () => {
            showPresentation();
          }).withId('btn-present');

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
              a.button('◀ Prev', () => {
                store.previousSlide();
              }).withId('preview-prev');

              a.button('Next ▶', () => {
                store.nextSlide();
              }).withId('preview-next');
            });

            a.separator();

            // Preview content
            a.scroll(() => {
              previewContainer = a.vbox(() => {
                previewHeading = a.label('', undefined, undefined, undefined, undefined).withId('preview-heading');
                previewSubheading = a.label('', undefined, undefined, undefined, undefined).withId('preview-subheading');
                a.separator();
                previewContent = a.label('', undefined, undefined, undefined, undefined).withId('preview-content');
              });
            });
          });
        }, 0.35);
      });
    });

    // Subscribe to store changes for reactive updates
    store.subscribe(() => {
      refreshPreview();
    });

    // Initial render
    refreshPreview();

    win.show();
  });

  return {
    getStore: () => store,
    refreshPreview,
    showPresentation,
  };
}

// Main entry point
if (require.main === module) {
  app({ title: 'Slydes' }, (a) => {
    createSlydesApp(a);
  });
}
