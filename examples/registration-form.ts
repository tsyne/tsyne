/**
 * Registration Form Example
 *
 * Demonstrates Tsyne's validation system with a user sign-up form.
 * Shows real-time validation feedback and form-level validation.
 *
 * Features demonstrated:
 * - Built-in validators (required, email, minLength, etc.)
 * - Password validation with strength requirements
 * - Confirm password matching
 * - Phone number validation
 * - Form-level validation with error display
 * - Submit button enabling/disabling based on validity
 *
 * Usage:
 *   npx ts-node examples/registration-form.ts
 */

import { app, Entry, Label, Button, PasswordEntry, Window } from '../core/src';
import { validators, createFormValidator, FormValidator, ValidatedField } from '../core/src/validation';
import { StringBinding } from '../core/src/binding';

// ============================================================================
// Application Setup
// ============================================================================

export function createRegistrationFormApp(appInstance: ReturnType<typeof app> extends infer A ? A : never) {
  const a = appInstance;

  // ============================================================================
  // Form Setup with Validation
  // ============================================================================

  // Password binding for confirm password matching
  const passwordBinding = new StringBinding('');

  // Create form validator with all fields
  const form = createFormValidator({
    username: {
      value: '',
      validator: validators.all(
        validators.required('Username is required'),
        validators.minLength(3, 'Username must be at least 3 characters'),
        validators.maxLength(20, 'Username must be at most 20 characters'),
        validators.alphanumeric('Username can only contain letters and numbers')
      )
    },
    email: {
      value: '',
      validator: validators.all(
        validators.required('Email is required'),
        validators.email('Please enter a valid email address')
      )
    },
    phone: {
      value: '',
      validator: validators.phone('Please enter a valid phone number')
    },
    password: {
      value: '',
      validator: validators.all(
        validators.required('Password is required'),
        validators.password({
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSpecial: false
        })
      )
    },
    confirmPassword: {
      value: '',
      validator: validators.all(
        validators.required('Please confirm your password'),
        validators.matches(() => passwordBinding.get(), 'Passwords do not match')
      )
    },
    age: {
      value: '',
      validator: validators.all(
        validators.required('Age is required'),
        validators.integer('Please enter a whole number'),
        validators.range(13, 120, 'You must be between 13 and 120 years old')
      )
    }
  });

  // Track entries for validation (using any since we use both Entry and PasswordEntry)
  const entries: Map<string, Entry | PasswordEntry> = new Map();
  const errorLabels: Map<string, Label> = new Map();
  let submitButton: Button;
  let windowRef: Window;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  function createFormField(
    fieldName: string,
    labelText: string,
    placeholder: string,
    isPassword: boolean = false
  ): void {
    const field = form.getField(fieldName);
    if (!field) return;

    a.vbox(() => {
      // Label
      a.label(labelText, undefined, undefined, undefined, { bold: true });

      // Input field
      let entryWidget: Entry | PasswordEntry;
      if (isPassword) {
        const pwEntry = a.passwordentry(placeholder, async () => {
          const text = await pwEntry.getText();
          field.set(text);
          if (fieldName === 'password') {
            passwordBinding.set(text);
          }
          validateField(fieldName);
        });
        entryWidget = pwEntry;
      } else {
        const textEntry = a.entry(placeholder, async () => {
          const text = await textEntry.getText();
          field.set(text);
          validateField(fieldName);
        });
        entryWidget = textEntry;
      }
      entries.set(fieldName, entryWidget);

      // Error label (initially empty)
      const errorLabel = a.label('', 'error');
      errorLabels.set(fieldName, errorLabel);
      field.bindErrorLabel(errorLabel);
    });
  }

  async function validateField(fieldName: string): Promise<void> {
    const field = form.getField(fieldName);
    const entry = entries.get(fieldName);
    if (!field || !entry) return;

    // Sync entry value and validate
    await field.syncAndValidate(entry);

    // Update submit button state
    updateSubmitButton();

    // If password changed, also revalidate confirm password
    if (fieldName === 'password') {
      const confirmField = form.getField('confirmPassword');
      const confirmEntry = entries.get('confirmPassword');
      if (confirmField && confirmEntry) {
        await confirmField.syncAndValidate(confirmEntry);
      }
    }
  }

  async function validateAllFields(): Promise<boolean> {
    // Sync all entries first
    for (const [fieldName, entry] of entries) {
      const field = form.getField(fieldName);
      if (field) {
        await field.syncAndValidate(entry);
      }
    }

    const result = form.validateAll();
    return result.valid;
  }

  function updateSubmitButton(): void {
    // Enable button if form appears valid
    // Full validation happens on submit
    if (submitButton) {
      const allFieldsHaveValues = Array.from(entries.values()).every(async (entry) => {
        const text = await entry.getText();
        return text.length > 0;
      });
    }
  }

  function clearForm(): void {
    form.reset();
    passwordBinding.set('');

    // Clear all entries
    entries.forEach((entry) => {
      entry.setText('');
    });

    // Clear all error labels
    errorLabels.forEach((label) => {
      label.setText('');
    });
  }

  // ============================================================================
  // UI Creation
  // ============================================================================

  a.window({ title: 'User Registration', width: 450, height: 700 }, (win) => {
    win.setContent(() => {
      a.scroll(() => {
        a.vbox(() => {
          // Header
          a.label('Create Your Account', undefined, 'center', undefined, { bold: true });
          a.label('Please fill in all required fields', undefined, 'center');
          a.separator();

          // Form Fields
          createFormField('username', 'Username *', 'Choose a username');
          createFormField('email', 'Email Address *', 'Enter your email');
          createFormField('phone', 'Phone Number', 'Enter your phone (optional)');
          createFormField('password', 'Password *', 'Create a password', true);
          createFormField('confirmPassword', 'Confirm Password *', 'Confirm your password', true);
          createFormField('age', 'Age *', 'Enter your age');

          a.separator();

          // Password Requirements Info
          a.label('Password Requirements:', undefined, undefined, undefined, { italic: true });
          a.label('- At least 8 characters');
          a.label('- Contains uppercase letter');
          a.label('- Contains lowercase letter');
          a.label('- Contains a number');

          a.separator();

          // Action Buttons
          a.hbox(() => {
            // Submit Button
            submitButton = a.button('Create Account').onClick(async () => {
              const isValid = await validateAllFields();

              if (isValid) {
                const values = form.getValues();
                console.log('Registration data:', values);

                win.showInfo(
                  'Registration Successful',
                  `Welcome, ${values.username}! Your account has been created.`
                );

                clearForm();
              } else {
                win.showError(
                  'Validation Error',
                  'Please fix the errors in the form before submitting.'
                );
              }
            });

            // Clear Button
            a.button('Clear Form').onClick(() => {
              clearForm();
            });
          });

          a.separator();

          // Terms Notice
          a.label('By creating an account, you agree to our Terms of Service and Privacy Policy.', undefined, undefined, 'word', { italic: true });
        });
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
  app({ title: 'Registration Form' }, (a) => {
    createRegistrationFormApp(a);
  });
}
