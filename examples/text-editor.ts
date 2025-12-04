/**
 * Text Editor Example - DocTabs Demo
 *
 * Demonstrates DocTabs (document tabs with close buttons) for a
 * multi-document text editor interface.
 */

import { app, App, DocTabs } from '../src';

// Document state
interface Document {
  id: number;
  title: string;
  content: string;
  modified: boolean;
}

let documents: Document[] = [];
let nextDocId = 1;
let statusLabel: any;
let docTabsRef: DocTabs;
let appRef: App;

// Create a new document
function createDocument(title?: string): Document {
  const doc: Document = {
    id: nextDocId++,
    title: title || `Untitled ${nextDocId - 1}`,
    content: '',
    modified: false
  };
  documents.push(doc);
  return doc;
}

// Find document by title
function findDocByTitle(title: string): Document | undefined {
  return documents.find(d => d.title === title);
}

// Remove document by title
function removeDocByTitle(title: string): void {
  documents = documents.filter(d => d.title !== title);
}

// Helper to create document content (editor area)
function createDocumentContent(a: App, doc: Document): void {
  a.vbox(() => {
    const editor = a.multilineentry('Start typing...', 'word');
    editor.setText(doc.content);

    a.hbox(() => {
      a.button('Mark Modified').onClick(() => {
        doc.modified = true;
        updateStatus(`${doc.title} marked as modified`);
      });
      a.button('Clear').onClick(() => {
        editor.setText('');
        doc.modified = true;
        updateStatus(`${doc.title} cleared`);
      });
      a.label(`  | ${doc.title}`);
    });
  });
}

// Helper to add a new document tab
async function addDocumentTab(doc: Document): Promise<void> {
  await docTabsRef.append(doc.title, () => {
    createDocumentContent(appRef, doc);
  }, true);
}

// Helper to update status
function updateStatus(message: string): void {
  if (statusLabel) {
    statusLabel.setText(`${message} | Documents: ${documents.length}`);
  }
}

app({ title: 'Text Editor' }, (a) => {
  // Store app reference for dynamic tab creation
  appRef = a;

  a.window({ title: 'Text Editor - DocTabs Demo', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.border({
        // Top toolbar
        top: () => {
          a.vbox(() => {
            a.hbox(() => {
              a.button('New Document').onClick(async () => {
                const doc = createDocument();
                await addDocumentTab(doc);
                updateStatus(`Created: ${doc.title}`);
              });
              a.button('Open Sample').onClick(async () => {
                const doc = createDocument(`Sample ${nextDocId - 1}.txt`);
                doc.content = `This is sample document ${doc.id}.\n\nAdd your content here.\n\nClick the X button on the tab to close this document.`;
                await addDocumentTab(doc);
                updateStatus(`Opened: ${doc.title}`);
              });
              a.button('Close All').onClick(async () => {
                const confirmed = await win.showConfirm(
                  'Close All Documents',
                  'Are you sure you want to close all documents?'
                );
                if (confirmed) {
                  // Remove all tabs from end to start
                  while (docTabsRef.getTabCount() > 0) {
                    await docTabsRef.remove(0);
                  }
                  documents = [];
                  updateStatus('All documents closed');
                }
              });
            });
            a.separator();
          });
        },
        // Main content - DocTabs
        center: () => {
          // Create initial documents
          const doc1 = createDocument('Welcome.txt');
          doc1.content = 'Welcome to the Text Editor!\n\nThis demo showcases DocTabs - tabs with close buttons.\n\nFeatures:\n- Click the X button on any tab to close it\n- Use "New Document" to add more tabs\n- Each tab has its own text editing area\n\nTry editing this text and switching between tabs!';

          const doc2 = createDocument('Notes.txt');
          doc2.content = 'Your notes go here...\n\nDocTabs are perfect for:\n- Text editors\n- IDE-style interfaces\n- Document management\n- Any multi-document workflow';

          const doc3 = createDocument('README.md');
          doc3.content = '# DocTabs Example\n\nDocTabs provides a document-style tab interface\nwith close buttons on each tab.\n\n## API\n\n- doctabs(tabs, options) - Create tabs\n- append(title, builder) - Add new tab\n- remove(index) - Remove tab\n- select(index) - Select tab\n\n## Events\n\n- onClosed(index, title) - Called when tab is closed';

          docTabsRef = a.doctabs(
            [
              {
                title: doc1.title,
                builder: () => createDocumentContent(a, doc1)
              },
              {
                title: doc2.title,
                builder: () => createDocumentContent(a, doc2)
              },
              {
                title: doc3.title,
                builder: () => createDocumentContent(a, doc3)
              }
            ],
            {
              location: 'top',
              onClosed: (tabIndex, tabTitle) => {
                const doc = findDocByTitle(tabTitle);
                if (doc && doc.modified) {
                  updateStatus(`Closed (modified): ${tabTitle}`);
                } else {
                  updateStatus(`Closed: ${tabTitle}`);
                }
                removeDocByTitle(tabTitle);
              }
            }
          );
        },
        // Bottom status bar
        bottom: () => {
          a.hbox(() => {
            statusLabel = a.label('Ready | Documents: 3');
          });
        }
      });
    });

    win.show();
  });
});
