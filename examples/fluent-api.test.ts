/**
 * Comprehensive tests demonstrating fluent-selenium style API
 *
 * This test demonstrates all the fluent-selenium equivalent features:
 * 1. within() - retry element location for a specified period
 * 2. without() - wait for elements to disappear
 * 3. shouldBe() - assert text equals expected
 * 4. shouldContain() - assert text contains substring
 * 5. shouldMatch() - assert text matches regex
 * 6. shouldNotBe() - assert text does not equal expected
 * 7. Enhanced Expect assertions (toNotHaveText, toMatchText, etc.)
 * 8. waitForNavigation() - wait for page navigation to complete
 */

import {
  TsyneBrowserTest,
  browserTest,
  describeBrowser,
  runBrowserTests,
  TestPage
} from '../core/src/tsyne-browser-test';

// Test pages
const fluentTestPages: TestPage[] = [
  {
    path: '/fluent-within',
    code: `
const { vbox, label, button, hbox } = tsyne;

vbox(() => {
  const statusLabel = label("Ready");
  statusLabel.id = "status";

  let counter = 0;
  button("Click Me", () => {
    counter++;
    // Simulate delayed update
    setTimeout(() => {
      statusLabel.setText(\`Clicked \${counter} times\`);
    }, 500);
  });
});
    `
  },
  {
    path: '/fluent-without',
    code: `
const { vbox, label, button } = tsyne;

vbox(() => {
  const loadingLabel = label("Loading...");
  loadingLabel.id = "loading";

  const resultLabel = label("");
  resultLabel.id = "result";

  button("Load Data", () => {
    loadingLabel.setText("Loading...");
    resultLabel.setText("");

    setTimeout(() => {
      loadingLabel.setText("");
      resultLabel.setText("Data loaded successfully");
    }, 1000);
  });
});
    `
  },
  {
    path: '/fluent-assertions',
    code: `
const { vbox, label, entry, button, hbox } = tsyne;

vbox(() => {
  const emailEntry = entry("Enter email");
  emailEntry.id = "email";

  const statusLabel = label("Enter your email");
  statusLabel.id = "status";

  button("Validate", () => {
    emailEntry.getText().then(email => {
      const emailRegex = /^[a-z]+@[a-z]+\\.[a-z]+$/;
      if (emailRegex.test(email)) {
        statusLabel.setText("Valid email: " + email);
      } else {
        statusLabel.setText("Invalid email format");
      }
    });
  });
});
    `
  },
  {
    path: '/fluent-navigation',
    code: `
const { vbox, label, button, hbox } = tsyne;

vbox(() => {
  label("Navigation Test Page");

  button("Go to Success Page", () => {
    browserContext.navigate("/success");
  });
});
    `
  },
  {
    path: '/success',
    code: `
const { vbox, label, button } = tsyne;

vbox(() => {
  label("Success!");
  label("You have successfully navigated.");

  button("Go Back", () => {
    browserContext.back();
  });
});
    `
  },
  {
    path: '/fluent-chaining',
    code: `
const { vbox, label, button } = tsyne;

vbox(() => {
  const messageLabel = label("Initial message");
  messageLabel.id = "message";

  let step = 0;
  button("Next Step", () => {
    step++;
    if (step === 1) {
      messageLabel.setText("Step 1: Processing");
    } else if (step === 2) {
      messageLabel.setText("Step 2: Almost done");
    } else if (step === 3) {
      messageLabel.setText("Step 3: Complete!");
    }
  });

  button("Reset", () => {
    step = 0;
    messageLabel.setText("Initial message");
  });
});
    `
  },
  {
    path: '/fluent-dynamic',
    code: `
const { vbox, label, button } = tsyne;

vbox(() => {
  label("Dynamic Content Test");

  const container = vbox(() => {});
  container.id = "container";

  let itemCount = 0;
  button("Add Item", () => {
    itemCount++;
    // In real app, would dynamically add labels here
    // For test purposes, we'll track count
  });

  const countLabel = label("Items: 0");
  countLabel.id = "count";

  button("Add Item", () => {
    itemCount++;
    countLabel.setText(\`Items: \${itemCount}\`);
  });
});
    `
  }
];

describeBrowser('Fluent-Selenium API Tests', () => {

  browserTest(
    'should use within() to retry element location',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-within');
      const ctx = browserTest.getContext();

      // Click button
      await ctx.getByText("Click Me").click();
      await ctx.wait(50);

      // Use within() to wait up to 2 seconds for text to update
      // This will retry until the text appears (after 500ms delay)
      await ctx.getByID("status").within(2000).shouldBe("Clicked 1 times");
    }
  );

  browserTest(
    'should use without() to wait for element to disappear',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-without');
      const ctx = browserTest.getContext();

      // Click load button
      await ctx.getByText("Load Data").click();
      await ctx.wait(50);

      // Verify loading appears
      await ctx.expect(ctx.getByID("loading")).toHaveText("Loading...");

      // Use without() to wait for loading to disappear
      await ctx.getByID("loading").without(2000);

      // Verify result appears
      await ctx.expect(ctx.getByID("result")).toHaveText("Data loaded successfully");
    }
  );

  browserTest(
    'should use shouldBe() for exact text assertions',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-assertions');
      const ctx = browserTest.getContext();

      // Initial state
      await ctx.getByID("status").shouldBe("Enter your email");

      // Type valid email
      await ctx.getByID("email").type("test@example.com");
      await ctx.wait(50);

      // Validate
      await ctx.getByText("Validate").click();
      await ctx.wait(50);

      // Check result with shouldBe
      await ctx.getByID("status").shouldBe("Valid email: test@example.com");
    }
  );

  browserTest(
    'should use shouldContain() for partial text match',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-assertions');
      const ctx = browserTest.getContext();

      // Type valid email
      await ctx.getByID("email").type("user@domain.org");
      await ctx.wait(50);

      // Validate
      await ctx.getByText("Validate").click();
      await ctx.wait(50);

      // Check result contains "Valid"
      await ctx.getByID("status").shouldContain("Valid");
      await ctx.getByID("status").shouldContain("user@domain.org");
    }
  );

  browserTest(
    'should use shouldMatch() for regex assertions',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-assertions');
      const ctx = browserTest.getContext();

      // Type valid email
      await ctx.getByID("email").type("hello@world.io");
      await ctx.wait(50);

      // Validate
      await ctx.getByText("Validate").click();
      await ctx.wait(50);

      // Check result matches pattern
      await ctx.getByID("status").shouldMatch(/^Valid email: .+@.+\..+$/);
    }
  );

  browserTest(
    'should use shouldNotBe() for negative assertions',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-assertions');
      const ctx = browserTest.getContext();

      // Type invalid email
      await ctx.getByID("email").type("notanemail");
      await ctx.wait(50);

      // Validate
      await ctx.getByText("Validate").click();
      await ctx.wait(50);

      // Verify it's NOT a success message
      await ctx.getByID("status").shouldNotBe("Enter your email");
      await ctx.getByID("status").shouldContain("Invalid");
    }
  );

  browserTest(
    'should use waitForNavigation() after navigation',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-navigation');
      const ctx = browserTest.getContext();

      // Verify initial page
      await ctx.expect(ctx.getByText("Navigation Test Page")).toBeVisible();

      // Click navigation button
      await ctx.getByText("Go to Success Page").click();

      // Wait for navigation to complete
      await browserTest.waitForNavigation();

      // Verify we're on success page
      await ctx.expect(ctx.getByText("Success!")).toBeVisible();
      await ctx.expect(ctx.getByText("You have successfully navigated.")).toBeVisible();
    }
  );

  browserTest(
    'should chain fluent assertions',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-chaining');
      const ctx = browserTest.getContext();

      // Initial state
      await ctx.getByID("message").shouldBe("Initial message");

      // Step 1
      await ctx.getByText("Next Step").click();
      await ctx.wait(50);
      await ctx.getByID("message").shouldBe("Step 1: Processing").then(async (locator) => {
        // After assertion passes, can continue chaining
        await ctx.getByText("Next Step").click();
        await ctx.wait(50);
      });

      // Step 2
      await ctx.getByID("message").shouldContain("Step 2");

      // Step 3
      await ctx.getByText("Next Step").click();
      await ctx.wait(50);
      await ctx.getByID("message").shouldMatch(/Step 3.*Complete/);
    }
  );

  browserTest(
    'should use enhanced Expect assertions',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-assertions');
      const ctx = browserTest.getContext();

      // Test toNotHaveText
      await ctx.expect(ctx.getByID("status")).toNotHaveText("Wrong text");

      // Test toMatchText
      await ctx.expect(ctx.getByID("status")).toMatchText(/Enter.*email/);

      // Type invalid email
      await ctx.getByID("email").type("invalid");
      await ctx.wait(50);
      await ctx.getByText("Validate").click();
      await ctx.wait(50);

      // Test toNotContainText
      await ctx.expect(ctx.getByID("status")).toNotContainText("Valid email:");
    }
  );

  browserTest(
    'should combine within() and fluent assertions',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-within');
      const ctx = browserTest.getContext();

      // Click multiple times with within() retry
      await ctx.getByText("Click Me").click();
      await ctx.getByID("status").within(2000).shouldContain("Clicked");

      await ctx.getByText("Click Me").click();
      await ctx.getByID("status").within(2000).shouldBe("Clicked 2 times");

      await ctx.getByText("Click Me").click();
      await ctx.getByID("status").within(2000).shouldMatch(/Clicked \d+ times/);
    }
  );

  browserTest(
    'should demonstrate all assertion methods',
    fluentTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/fluent-chaining');
      const ctx = browserTest.getContext();

      const messageLocator = ctx.getByID("message");

      // Positive assertions
      await ctx.expect(messageLocator).toHaveText("Initial message");
      await ctx.expect(messageLocator).toContainText("Initial");
      await ctx.expect(messageLocator).toMatchText(/^Initial/);
      await ctx.expect(messageLocator).toBeVisible();
      await ctx.expect(messageLocator).toExist();

      // Negative assertions
      await ctx.expect(messageLocator).toNotHaveText("Wrong");
      await ctx.expect(messageLocator).toNotContainText("Error");
      await ctx.expect(messageLocator).toNotMatchText(/^Error/);

      // Count assertions
      await ctx.expect(ctx.getByType("button")).toHaveCount(2);
      await ctx.expect(ctx.getByType("button")).toHaveCountGreaterThan(1);
      await ctx.expect(ctx.getByType("button")).toHaveCountLessThan(5);
    }
  );
});

// Run tests if this file is executed directly
if (require.main === module) {
  runBrowserTests().catch(console.error);
}
