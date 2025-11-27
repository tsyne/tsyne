/**
 * Accessibility Audit Testing for Tsyne Applications
 *
 * Provides a11y validation utilities similar to axe-core or Lighthouse accessibility audits.
 * Tests for common accessibility issues including:
 * - Missing labels on form controls
 * - Missing roles on interactive elements
 * - Keyboard accessibility
 * - Focus management
 *
 * Uses the new getByRole, getByLabel, and getByTestId selectors.
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { App } from '../src/app';

// Accessibility audit result types
interface A11yViolation {
  rule: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  widgetId?: string;
  widgetType?: string;
}

interface A11yAuditResult {
  passed: boolean;
  violations: A11yViolation[];
  warnings: A11yViolation[];
  stats: {
    totalWidgets: number;
    widgetsWithRoles: number;
    widgetsWithLabels: number;
    interactiveWidgets: number;
  };
}

/**
 * Audit a Tsyne application for accessibility issues
 */
async function auditAccessibility(ctx: TestContext): Promise<A11yAuditResult> {
  const violations: A11yViolation[] = [];
  const warnings: A11yViolation[] = [];

  // Get all widgets
  const allWidgets = await ctx.getAllWidgets();

  let widgetsWithRoles = 0;
  let widgetsWithLabels = 0;
  let interactiveWidgets = 0;

  for (const widget of allWidgets) {
    const isInteractive = ['button', 'entry', 'checkbox', 'select', 'slider', 'radiogroup'].includes(widget.type || '');

    if (isInteractive) {
      interactiveWidgets++;
    }

    // Check for buttons without accessible text
    if (widget.type === 'button' && (!widget.text || widget.text.trim() === '')) {
      violations.push({
        rule: 'button-name',
        impact: 'critical',
        description: 'Button has no accessible name',
        widgetId: widget.id,
        widgetType: widget.type
      });
    }

    // Check for entries without placeholder (as a proxy for labels)
    if (widget.type === 'entry') {
      // We can't directly check for associated labels in this framework,
      // but we can recommend using accessibility() method
      warnings.push({
        rule: 'label-association',
        impact: 'moderate',
        description: 'Consider adding accessibility label to form control',
        widgetId: widget.id,
        widgetType: widget.type
      });
    }
  }

  // Try to find widgets with roles
  const roleTypes = ['button', 'textbox', 'checkbox', 'combobox', 'navigation', 'main', 'dialog'];
  for (const role of roleTypes) {
    const roleWidgets = await ctx.getByRole(role).findAll();
    widgetsWithRoles += roleWidgets.length;
  }

  // Try to find widgets with labels
  // This is a heuristic - we check for common label patterns
  const labelPatterns = ['Username', 'Password', 'Email', 'Submit', 'Cancel', 'Name', 'Search'];
  for (const pattern of labelPatterns) {
    const labeledWidgets = await ctx.getByLabel(pattern).findAll();
    widgetsWithLabels += labeledWidgets.length;
  }

  return {
    passed: violations.filter(v => v.impact === 'critical').length === 0,
    violations,
    warnings,
    stats: {
      totalWidgets: allWidgets.length,
      widgetsWithRoles,
      widgetsWithLabels,
      interactiveWidgets
    }
  };
}

describe.skip('Accessibility Audit', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should pass audit for app with proper accessibility', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Accessible App', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Login Form')
              .accessibility({
                role: 'heading',
                label: 'Login Form Heading'
              });

            app.label('Username:');
            app.entry('Enter username')
              
              .accessibility({
                role: 'textbox',
                label: 'Username',
                description: 'Enter your username'
              });

            app.label('Password:');
            app.passwordentry('Enter password')
              .withId('password-input')
              .accessibility({
                role: 'textbox',
                label: 'Password',
                description: 'Enter your password'
              });

            app.button('Login', () => {})
              
              .accessibility({
                role: 'button',
                label: 'Login Button',
                hint: 'Press Enter or click to login'
              });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const result = await auditAccessibility(ctx);

    // Should have no critical violations
    const criticalViolations = result.violations.filter(v => v.impact === 'critical');
    expect(criticalViolations.length).toBe(0);

    // Should have found some widgets
    expect(result.stats.totalWidgets).toBeGreaterThan(0);
  });

  test('should detect missing button text', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Audit Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Empty button text - accessibility issue
            app.button('', () => {});
            // Valid button
            app.button('Valid Button', () => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const result = await auditAccessibility(ctx);

    // Should detect the empty button as a violation
    const buttonViolations = result.violations.filter(v => v.rule === 'button-name');
    expect(buttonViolations.length).toBeGreaterThan(0);
  });

  test('should use getByRole to find accessible elements', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Role Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.button('Submit', () => {})
              .accessibility({ role: 'button', label: 'Submit Form' });

            app.entry('Search...')
              .accessibility({ role: 'textbox', label: 'Search Input' });

            app.checkbox('I agree to terms', () => {})
              .accessibility({ role: 'checkbox', label: 'Terms Agreement' });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find elements by role
    const buttons = await ctx.getByRole('button').findAll();
    const textboxes = await ctx.getByRole('textbox').findAll();
    const checkboxes = await ctx.getByRole('checkbox').findAll();

    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(textboxes.length).toBeGreaterThanOrEqual(1);
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  test('should use getByLabel for form control selection', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Label Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.entry('Username')
              .accessibility({ label: 'Username Input Field' });

            app.entry('Email')
              .accessibility({ label: 'Email Address Field' });

            app.entry('Password')
              .accessibility({ label: 'Password Input Field' });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find elements by accessibility label
    const usernameField = await ctx.getByLabel('Username').findAll();
    const emailField = await ctx.getByLabel('Email').findAll();
    const passwordField = await ctx.getByLabel('Password').findAll();

    expect(usernameField.length).toBeGreaterThanOrEqual(1);
    expect(emailField.length).toBeGreaterThanOrEqual(1);
    expect(passwordField.length).toBeGreaterThanOrEqual(1);
  });

  test('should use getByTestId for stable test selectors', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'TestId Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.button('Dynamic Text Button', () => {})
              ;

            app.entry('Search')
              ;

            app.label('Status: Ready')
              ;
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find elements by test ID
    const submitBtn = await ctx.getByTestId('submit-btn').find();
    const searchInput = await ctx.getByTestId('search-input').find();
    const statusLabel = await ctx.getByTestId('status-label').find();

    expect(submitBtn).not.toBeNull();
    expect(searchInput).not.toBeNull();
    expect(statusLabel).not.toBeNull();

    // Click using testId
    await ctx.getByTestId('submit-btn').click();

    // Type using testId
    await ctx.getByTestId('search-input').type('test query');

    // Verify text using testId
    await ctx.expect(ctx.getByTestId('status-label')).toContainText('Status');
  });

  test('keyboard navigation test', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Keyboard Nav Test', width: 400, height: 200 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.entry('First field')
              ;
            app.entry('Second field')
              ;
            app.button('Submit', () => {})
              ;
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Test tab navigation using focusNext()
    await ctx.focusNext();  // Focus first element
    await ctx.focusNext();  // Move to second element

    // Verify all focusable elements can be reached
    const field1 = await ctx.getByTestId('field-1').find();
    const field2 = await ctx.getByTestId('field-2').find();
    const submit = await ctx.getByTestId('submit').find();

    expect(field1).not.toBeNull();
    expect(field2).not.toBeNull();
    expect(submit).not.toBeNull();
  });

  test('combined accessibility selectors test', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Combined Selectors', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Widget with multiple accessibility features
            app.button('Register', () => {})
              .withId('register-btn')
              
              .accessibility({
                role: 'button',
                label: 'Register Account',
                description: 'Creates a new user account',
                hint: 'Press Enter to register'
              });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find same element using different selectors
    const byId = await ctx.getByID('register-btn').find();
    const byTestId = await ctx.getByTestId('register-button').find();
    const byRole = await ctx.getByRole('button').find();
    const byLabel = await ctx.getByLabel('Register Account').find();
    const byText = await ctx.getByExactText('Register').find();

    // All should find the same element
    expect(byId).not.toBeNull();
    expect(byTestId).not.toBeNull();
    expect(byRole).not.toBeNull();
    expect(byLabel).not.toBeNull();
    expect(byText).not.toBeNull();
  });
});

describe.skip('Accessibility Best Practices', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('demonstrates proper form labeling', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Form Labels', width: 400, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // BEST PRACTICE: Each form control has an accessibility label

            app.label('Full Name');
            app.entry('Enter your full name')
              
              .accessibility({
                role: 'textbox',
                label: 'Full Name',
                description: 'Your first and last name'
              });

            app.label('Email Address');
            app.entry('example@email.com')
              
              .accessibility({
                role: 'textbox',
                label: 'Email Address',
                description: 'Your email for account recovery'
              });

            app.button('Submit Form', () => {})
              
              .accessibility({
                role: 'button',
                label: 'Submit Registration Form',
                hint: 'Press Enter or Space to submit'
              });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All fields should be findable by label
    expect(await ctx.getByLabel('Full Name').find()).not.toBeNull();
    expect(await ctx.getByLabel('Email').find()).not.toBeNull();
    expect(await ctx.getByLabel('Submit').find()).not.toBeNull();

    // Should also work with test IDs
    expect(await ctx.getByTestId('name-field').find()).not.toBeNull();
    expect(await ctx.getByTestId('email-field').find()).not.toBeNull();
    expect(await ctx.getByTestId('submit-btn').find()).not.toBeNull();
  });
});
