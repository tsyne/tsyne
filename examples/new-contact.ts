/**
 * Contact Manager Demo
 *
 * Demonstrates the showForm dialog for adding contacts with various field types.
 * Shows how to use entry, password, multiline, select, and check field types.
 */

import { app, window, vbox, hbox, label, button, scroll, separator } from '../src';

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
  notes: string;
  favorite: boolean;
}

app({ title: 'Contact Manager' }, () => {
  window({ title: 'Contact Manager', width: 600, height: 500 }, (win) => {
    const contacts: Contact[] = [];
    let contactListLabel: any;
    let statusLabel: any;

    const updateContactList = () => {
      if (contacts.length === 0) {
        contactListLabel.setText('No contacts yet. Click "Add Contact" to get started!');
      } else {
        const contactLines = contacts.map((c, i) => {
          const star = c.favorite ? '★ ' : '';
          return `${i + 1}. ${star}${c.firstName} ${c.lastName} (${c.category}) - ${c.email}`;
        });
        contactListLabel.setText(contactLines.join('\n'));
      }
    };

    win.setContent(() => {
      vbox(() => {
        label('Contact Manager', undefined, 'center', undefined, { bold: true });
        separator();

        // Toolbar buttons
        hbox(() => {
          button('Add Contact', async () => {
            statusLabel.setText('Opening form...');

            const result = await win.showForm(
              'Add New Contact',
              [
                { name: 'firstName', label: 'First Name', placeholder: 'John', hint: 'Required' },
                { name: 'lastName', label: 'Last Name', placeholder: 'Doe', hint: 'Required' },
                { name: 'email', label: 'Email', placeholder: 'john.doe@example.com', hint: 'e.g. name@company.com' },
                { name: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567' },
                { name: 'category', label: 'Category', type: 'select', options: ['Work', 'Personal', 'Family', 'Other'], value: 'Personal' },
                { name: 'notes', label: 'Notes', type: 'multiline', placeholder: 'Additional notes...' },
                { name: 'favorite', label: 'Favorite', type: 'check' }
              ],
              { confirmText: 'Add Contact', dismissText: 'Cancel' }
            );

            if (result.submitted) {
              const newContact: Contact = {
                firstName: result.values.firstName as string || '',
                lastName: result.values.lastName as string || '',
                email: result.values.email as string || '',
                phone: result.values.phone as string || '',
                category: result.values.category as string || 'Other',
                notes: result.values.notes as string || '',
                favorite: result.values.favorite as boolean || false
              };

              // Validate required fields
              if (!newContact.firstName || !newContact.lastName) {
                await win.showError('Error', 'First name and last name are required!');
                statusLabel.setText('Contact not added - missing required fields');
                return;
              }

              contacts.push(newContact);
              updateContactList();
              statusLabel.setText(`Added contact: ${newContact.firstName} ${newContact.lastName}`);
              await win.showInfo('Success', `Contact "${newContact.firstName} ${newContact.lastName}" added!`);
            } else {
              statusLabel.setText('Add contact cancelled');
            }
          });

          button('Quick Add', async () => {
            // Simpler form with fewer fields
            const result = await win.showForm(
              'Quick Add Contact',
              [
                { name: 'name', label: 'Full Name', placeholder: 'John Doe' },
                { name: 'email', label: 'Email', placeholder: 'email@example.com' }
              ],
              { confirmText: 'Add', dismissText: 'Cancel' }
            );

            if (result.submitted && result.values.name) {
              const nameParts = (result.values.name as string).split(' ');
              const newContact: Contact = {
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: result.values.email as string || '',
                phone: '',
                category: 'Personal',
                notes: '',
                favorite: false
              };
              contacts.push(newContact);
              updateContactList();
              statusLabel.setText(`Quick added: ${result.values.name}`);
            }
          });

          button('Clear All', async () => {
            if (contacts.length === 0) {
              await win.showInfo('Info', 'No contacts to clear.');
              return;
            }

            const confirmed = await win.showConfirm(
              'Clear All Contacts',
              `Are you sure you want to delete all ${contacts.length} contacts?`
            );

            if (confirmed) {
              contacts.length = 0;
              updateContactList();
              statusLabel.setText('All contacts cleared');
            }
          });
        });

        separator();

        // Contact list header
        label('Contacts:', undefined, 'leading', undefined, { bold: true });

        // Scrollable contact list
        scroll(() => {
          vbox(() => {
            contactListLabel = label('No contacts yet. Click "Add Contact" to get started!', undefined, 'leading', 'word');
          });
        });

        separator();

        // Status bar
        statusLabel = label('Ready');
      });
    });

    win.show();
  });
});
