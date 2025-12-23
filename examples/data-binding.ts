/**
 * Two-Way Data Binding Example
 *
 * Demonstrates how to bind UI widgets to observable state,
 * keeping them synchronized automatically.
 */

import { app, resolveTransport, window, vbox, label, entry, button, ObservableState, ComputedState  } from '../core/src';

// Create observable states
const firstName = new ObservableState('John');
const lastName = new ObservableState('Doe');

// Create a computed state that derives from other states
const fullName = new ComputedState(
  [firstName, lastName],
  (first, last) => `${first} ${last}`
);

// Create display label references
let firstNameDisplay: any;
let lastNameDisplay: any;
let fullNameDisplay: any;

// Subscribe to state changes and update UI
firstName.subscribe((newValue) => {
  firstNameDisplay?.setText(`First Name: ${newValue}`);
});

lastName.subscribe((newValue) => {
  lastNameDisplay?.setText(`Last Name: ${newValue}`);
});

fullName.subscribe((newValue) => {
  fullNameDisplay?.setText(`Full Name: ${newValue}`);
});

app(resolveTransport(), { title: 'Data Binding Demo' }, () => {
  window({ title: 'Data Binding Example', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Two-Way Data Binding Example');
        label('');

        // First name input
        const firstEntry = entry('First name');
        button('Update First Name').onClick(async () => {
          const value = await firstEntry.getText();
          firstName.set(value);
        });

        // Last name input
        const lastEntry = entry('Last name');
        button('Update Last Name').onClick(async () => {
          const value = await lastEntry.getText();
          lastName.set(value);
        });

        label('');
        label('--- Current State ---');

        // Display current state values
        firstNameDisplay = label(`First Name: ${firstName.get()}`);
        lastNameDisplay = label(`Last Name: ${lastName.get()}`);
        fullNameDisplay = label(`Full Name: ${fullName.get()}`);

        label('');

        // Buttons to manipulate state
        button('Reset to Defaults').onClick(() => {
          firstName.set('John');
          lastName.set('Doe');
        });

        button('Clear All').onClick(() => {
          firstName.set('');
          lastName.set('');
        });
      });
    });

    win.show();
  });
});
