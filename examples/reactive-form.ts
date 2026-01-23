/**
 * Reactive Form Example
 *
 * Demonstrates Tsyne's data binding system with auto-syncing form fields.
 * Shows how bindings automatically keep widgets and data in sync.
 *
 * Features demonstrated:
 * - StringBinding for text fields
 * - BoolBinding for checkboxes
 * - NumberBinding for sliders
 * - ComputedBinding for derived values
 * - Two-way binding between widgets and data
 *
 * Usage:
 *   npx tsx examples/reactive-form.ts
 */

import { app, resolveTransport  } from 'tsyne';
import {
  StringBinding,
  BoolBinding,
  NumberBinding,
  ComputedBinding,
  createFormBindings
} from 'tsyne';

// ============================================================================
// Application Setup
// ============================================================================

export function createReactiveFormApp(appInstance: ReturnType<typeof app> extends infer A ? A : never) {
  // Create the reactive form app with the provided app instance
  const a = appInstance;

  // ============================================================================
  // Data Bindings
  // ============================================================================

  // Individual field bindings
  const firstName = new StringBinding('');
  const lastName = new StringBinding('');
  const email = new StringBinding('');
  const age = new NumberBinding(25, 0, 120);
  const newsletter = new BoolBinding(false);
  const notifications = new BoolBinding(true);

  // Computed binding: full name derived from first and last name
  const fullName = new ComputedBinding(
    [firstName, lastName],
    ([first, last]) => {
      if (first && last) return `${first} ${last}`;
      if (first) return first;
      if (last) return last;
      return 'Enter your name';
    }
  );

  // Computed binding: form summary
  const formSummary = new ComputedBinding(
    [firstName, lastName, email, age, newsletter],
    ([first, last, emailVal, ageVal, news]) => {
      const parts: string[] = [];
      if (first || last) parts.push(`Name: ${first} ${last}`.trim());
      if (emailVal) parts.push(`Email: ${emailVal}`);
      parts.push(`Age: ${ageVal}`);
      parts.push(`Newsletter: ${news ? 'Yes' : 'No'}`);
      return parts.join(' | ');
    }
  );

  // ============================================================================
  // UI Creation
  // ============================================================================

  a.window({ title: 'Reactive Form Demo', width: 500, height: 600 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('Reactive Form with Data Binding', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Display computed full name
        const fullNameLabel = a.label('Enter your name', undefined, 'center');
        fullName.addListener((name) => fullNameLabel.setText(name));

        a.separator();

        // First Name Field
        a.hbox(() => {
          a.label('First Name:', undefined, undefined, undefined, { bold: true });
          const firstNameEntry = a.entry('Enter first name', (text) => {
            firstName.set(text);
          });
          firstName.bindEntry(firstNameEntry);
        });

        // Last Name Field
        a.hbox(() => {
          a.label('Last Name:', undefined, undefined, undefined, { bold: true });
          const lastNameEntry = a.entry('Enter last name', (text) => {
            lastName.set(text);
          });
          lastName.bindEntry(lastNameEntry);
        });

        // Email Field
        a.hbox(() => {
          a.label('Email:', undefined, undefined, undefined, { bold: true });
          const emailEntry = a.entry('Enter email', (text) => {
            email.set(text);
          });
          email.bindEntry(emailEntry);
        });

        // Age Slider
        a.hbox(() => {
          a.label('Age:', undefined, undefined, undefined, { bold: true });
          const ageLabel = a.label(`${age.get()}`);
          const ageSlider = a.slider(0, 120, age.get(), (value) => {
            age.set(value);
          });
          age.bindSlider(ageSlider);
          age.addListener((value) => ageLabel.setText(`${Math.round(value)}`));
        });

        a.separator();

        // Checkboxes
        a.hbox(() => {
          const newsletterCheckbox = a.checkbox('Subscribe to newsletter', (checked) => {
            newsletter.set(checked);
          });
          newsletter.bindCheckbox(newsletterCheckbox);
        });

        a.hbox(() => {
          const notificationsCheckbox = a.checkbox('Enable notifications', (checked) => {
            notifications.set(checked);
          });
          notifications.bindCheckbox(notificationsCheckbox);
        });

        a.separator();

        // Form Summary (auto-updating)
        a.label('Form Summary:', undefined, undefined, undefined, { bold: true });
        const summaryLabel = a.label(formSummary.get(), undefined, undefined, 'word');
        formSummary.addListener((summary) => summaryLabel.setText(summary));

        a.separator();

        // Action Buttons
        a.hbox(() => {
          // Set Sample Data button
          a.button('Fill Sample Data').onClick(() => {
            firstName.set('John');
            lastName.set('Doe');
            email.set('john.doe@example.com');
            age.set(30);
            newsletter.set(true);
            notifications.set(true);
          });

          // Clear Form button
          a.button('Clear Form').onClick(() => {
            firstName.set('');
            lastName.set('');
            email.set('');
            age.set(25);
            newsletter.set(false);
            notifications.set(true);
          });

          // Submit button
          a.button('Submit').onClick(async () => {
            const data = {
              firstName: firstName.get(),
              lastName: lastName.get(),
              email: email.get(),
              age: age.get(),
              newsletter: newsletter.get(),
              notifications: notifications.get()
            };
            console.log('Form submitted:', data);
            win.showInfo('Form Submitted', `Thank you, ${fullName.get()}!`);
          });
        });

        a.separator();

        // Live Data Display (for debugging)
        a.label('Live Binding Values:', undefined, undefined, undefined, { bold: true });

        // Create labels for each binding value
        const firstNameValueLabel = a.label(`firstName: "${firstName.get()}"`);
        const lastNameValueLabel = a.label(`lastName: "${lastName.get()}"`);
        const emailValueLabel = a.label(`email: "${email.get()}"`);
        const ageValueLabel = a.label(`age: ${age.get()}`);
        const newsletterValueLabel = a.label(`newsletter: ${newsletter.get()}`);
        const notificationsValueLabel = a.label(`notifications: ${notifications.get()}`);

        // Update labels when bindings change
        firstName.addListener((v) => firstNameValueLabel.setText(`firstName: "${v}"`));
        lastName.addListener((v) => lastNameValueLabel.setText(`lastName: "${v}"`));
        email.addListener((v) => emailValueLabel.setText(`email: "${v}"`));
        age.addListener((v) => ageValueLabel.setText(`age: ${Math.round(v)}`));
        newsletter.addListener((v) => newsletterValueLabel.setText(`newsletter: ${v}`));
        notifications.addListener((v) => notificationsValueLabel.setText(`notifications: ${v}`));
      });
    });
    win.show();
  });
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Only run if this is the main module
if (require.main === module) {
  app(resolveTransport(), { title: 'Reactive Form Demo' }, (a) => {
    createReactiveFormApp(a);
  });
}
