/**
 * Wizard Demo - Navigation Container Example
 *
 * Demonstrates the container.Navigation widget which provides:
 * - Stack-based navigation with back/forward controls
 * - Title management for each navigation level
 * - Multi-step wizard workflows
 */

import { App, Navigation, VBox, Entry, Label, Button, RadioGroup, Checkbox, Select } from '../core/src/index';

// Wizard state to collect data across steps
interface WizardData {
  name: string;
  email: string;
  plan: string;
  features: string[];
  paymentMethod: string;
}

const wizardData: WizardData = {
  name: '',
  email: '',
  plan: 'Basic',
  features: [],
  paymentMethod: 'Credit Card'
};

// Create the app
const appInstance = new App({ title: 'Multi-Step Wizard' });
let nav: Navigation;

// Widget references for collecting data
let nameEntry: Entry;
let emailEntry: Entry;
let planRadio: RadioGroup;
let paymentSelect: Select;

// Feature checkboxes
const featureCheckboxes: Checkbox[] = [];

function createStep1(a: App): VBox {
  return a.vbox(() => {
    a.label('Step 1: Personal Information', undefined, 'center', undefined, { bold: true });
    a.separator();

    a.label('Enter your name:');
    nameEntry = a.entry('Your full name');

    a.label('Enter your email:');
    emailEntry = a.entry('email@example.com');

    a.separator();

    a.button('Next: Choose Plan').onClick(() => {
      // Save step 1 data
      nameEntry.getText().then(name => {
        wizardData.name = name;
      });
      emailEntry.getText().then(email => {
        wizardData.email = email;
      });

      // Navigate to step 2
      nav.push(() => createStep2(a), 'Step 2: Select Plan');
    });
  });
}

function createStep2(a: App): VBox {
  return a.vbox(() => {
    a.label('Step 2: Choose Your Plan', undefined, 'center', undefined, { bold: true });
    a.separator();

    a.label('Select a subscription plan:');
    planRadio = a.radiogroup(
      ['Basic - $9/month', 'Pro - $19/month', 'Enterprise - $49/month'],
      wizardData.plan,
      (selected) => {
        wizardData.plan = selected;
      }
    );

    a.separator();

    a.hbox(() => {
      a.button('Back').onClick(async () => {
        await nav.back();
      });

      a.button('Next: Select Features').onClick(() => {
        // Get current plan selection
        planRadio.getSelected().then(plan => {
          wizardData.plan = plan;
        });

        // Navigate to step 3
        nav.push(() => createStep3(a), 'Step 3: Features');
      });
    });
  });
}

function createStep3(a: App): VBox {
  // Clear previous checkboxes
  featureCheckboxes.length = 0;

  return a.vbox(() => {
    a.label('Step 3: Select Features', undefined, 'center', undefined, { bold: true });
    a.separator();

    a.label('Choose additional features:');

    const features = [
      'Cloud Storage (10GB)',
      'Priority Support',
      'API Access',
      'Custom Domain',
      'Analytics Dashboard'
    ];

    features.forEach(feature => {
      const cb = a.checkbox(feature, (checked) => {
        if (checked) {
          if (!wizardData.features.includes(feature)) {
            wizardData.features.push(feature);
          }
        } else {
          const index = wizardData.features.indexOf(feature);
          if (index > -1) {
            wizardData.features.splice(index, 1);
          }
        }
      });
      featureCheckboxes.push(cb);
    });

    a.separator();

    a.hbox(() => {
      a.button('Back').onClick(async () => {
        await nav.back();
      });

      a.button('Next: Payment').onClick(() => {
        // Navigate to step 4
        nav.push(() => createStep4(a), 'Step 4: Payment');
      });
    });
  });
}

function createStep4(a: App): VBox {
  return a.vbox(() => {
    a.label('Step 4: Payment Method', undefined, 'center', undefined, { bold: true });
    a.separator();

    a.label('Select payment method:');
    paymentSelect = a.select(
      ['Credit Card', 'PayPal', 'Bank Transfer', 'Cryptocurrency'],
      (selected) => {
        wizardData.paymentMethod = selected;
      }
    );

    a.separator();

    a.hbox(() => {
      a.button('Back').onClick(async () => {
        await nav.back();
      });

      a.button('Review & Confirm').onClick(() => {
        // Get payment method
        paymentSelect.getSelected().then(method => {
          wizardData.paymentMethod = method;
        });

        // Navigate to confirmation
        nav.push(() => createConfirmation(a), 'Confirmation');
      });
    });
  });
}

function createConfirmation(a: App): VBox {
  return a.vbox(() => {
    a.label('Review Your Order', undefined, 'center', undefined, { bold: true });
    a.separator();

    a.label(`Name: ${wizardData.name || '(not provided)'}`);
    a.label(`Email: ${wizardData.email || '(not provided)'}`);
    a.label(`Plan: ${wizardData.plan}`);
    a.label(`Features: ${wizardData.features.length > 0 ? wizardData.features.join(', ') : 'None selected'}`);
    a.label(`Payment: ${wizardData.paymentMethod}`);

    a.separator();

    a.hbox(() => {
      a.button('Back').onClick(async () => {
        await nav.back();
      });

      a.button('Complete Order').onClick(() => {
        // Navigate to success
        nav.push(() => createSuccess(a), 'Order Complete');
      });
    });
  });
}

function createSuccess(a: App): VBox {
  return a.vbox(() => {
    a.label('Order Completed!', undefined, 'center', undefined, { bold: true });
    a.separator();

    a.label('Thank you for your order!', undefined, 'center');
    a.label(`Welcome, ${wizardData.name || 'Customer'}!`, undefined, 'center');
    a.label('You will receive a confirmation email shortly.', undefined, 'center');

    a.separator();

    a.button('Start New Order').onClick(async () => {
      // Reset wizard data
      wizardData.name = '';
      wizardData.email = '';
      wizardData.plan = 'Basic';
      wizardData.features = [];
      wizardData.paymentMethod = 'Credit Card';

      // Navigate back to the beginning
      // Go back multiple times to reach start
      for (let i = 0; i < 5; i++) {
        await nav.back();
      }
    });
  });
}

// Create the main window with Navigation container
appInstance.window({ title: 'Multi-Step Wizard', width: 500, height: 450 }, (win) => {
  win.setContent(() => {
    nav = appInstance.navigation(
      () => createStep1(appInstance),
      {
        title: 'Step 1: Personal Info',
        onBack: () => {
          console.log('User went back');
        },
        onForward: () => {
          console.log('User went forward');
        }
      }
    );
  });

  win.show();
});

appInstance.run();
