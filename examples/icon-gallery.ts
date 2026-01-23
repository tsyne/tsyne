/**
 * Icon Gallery - Display all available Fyne theme icons
 *
 * This example demonstrates the Icon widget which displays themed icons
 * that automatically adapt to light/dark system themes.
 *
 * Run: npx tsx examples/icon-gallery.ts
 */
import { app, resolveTransport  } from 'tsyne';
import { ThemeIconName } from 'tsyne';

// All available theme icon names organized by category
const iconCategories: { [category: string]: ThemeIconName[] } = {
  'Standard': [
    'cancel', 'confirm', 'delete', 'search', 'searchReplace'
  ],
  'Media': [
    'mediaPlay', 'mediaPause', 'mediaStop', 'mediaRecord', 'mediaReplay',
    'mediaSkipNext', 'mediaSkipPrevious', 'mediaFastForward', 'mediaFastRewind'
  ],
  'Navigation': [
    'home', 'menu', 'menuExpand', 'moveDown', 'moveUp', 'navigate',
    'arrowBack', 'arrowForward'
  ],
  'Files': [
    'file', 'fileApplication', 'fileAudio', 'fileImage', 'fileText', 'fileVideo',
    'folder', 'folderNew', 'folderOpen'
  ],
  'Documents': [
    'document', 'documentCreate', 'documentSave', 'documentPrint'
  ],
  'Content': [
    'content', 'contentAdd', 'contentClear', 'contentCopy', 'contentCut',
    'contentPaste', 'contentRedo', 'contentRemove', 'contentUndo'
  ],
  'View': [
    'viewFullScreen', 'viewRefresh', 'viewZoomFit', 'viewZoomIn', 'viewZoomOut',
    'viewRestore', 'visibility', 'visibilityOff'
  ],
  'Status': [
    'info', 'question', 'warning', 'error', 'help', 'history'
  ],
  'Actions': [
    'settings', 'mailAttachment', 'mailCompose', 'mailForward', 'mailReply',
    'mailReplyAll', 'mailSend'
  ],
  'Volume': [
    'volumeDown', 'volumeMute', 'volumeUp'
  ],
  'Misc': [
    'download', 'upload', 'computer', 'storage', 'account', 'login', 'logout',
    'list', 'grid', 'colorChromatic', 'colorPalette'
  ],
  'Checkboxes': [
    'checkButtonChecked', 'checkButton', 'radioButton', 'radioButtonChecked'
  ]
};

app(resolveTransport(), { title: 'Tsyne Icon Gallery' }, (a) => {
  a.window({ title: 'Theme Icon Gallery', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          a.label('Fyne Theme Icons', undefined, 'center', undefined, { bold: true });
          a.label('Click any icon to see its name', undefined, 'center');
          a.separator();

          // Create a section for each category
          for (const [category, icons] of Object.entries(iconCategories)) {
            a.vbox(() => {
              a.label(`${category}`, undefined, 'leading', undefined, { bold: true });

              // Use grid to display icons in rows
              a.gridwrap(80, 80, () => {
                for (const iconName of icons) {
                  a.vbox(() => {
                    a.center(() => {
                      a.icon(iconName);
                    });
                    a.label(iconName, undefined, 'center');
                  });
                }
              });

              a.separator();
            });
          }
        });
      });
    });
    win.show();
  });
});
