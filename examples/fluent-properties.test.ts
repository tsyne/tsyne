/**
 * Comprehensive tests demonstrating fluent property assertions
 *
 * This test demonstrates property assertions beyond text:
 * 1. shouldBeChecked() / shouldNotBeChecked() - checkbox state
 * 2. shouldHaveValue() - entry, slider, select values
 * 3. shouldHaveSelected() - select/radiogroup selected text
 * 4. shouldBeEnabled() / shouldBeDisabled() - enabled/disabled state
 * 5. shouldHaveType() - widget type verification
 * 6. shouldBeVisible() / shouldNotBeVisible() - visibility (fluent style)
 */

import {
  TsyneBrowserTest,
  browserTest,
  describeBrowser,
  runBrowserTests,
  TestPage
} from 'tsyne';

// Test pages
const propertyTestPages: TestPage[] = [
  {
    path: '/checkbox',
    code: `
const { vbox, checkbox, button } = tsyne;

const agreeCheckbox = checkbox("I agree to terms");
agreeCheckbox.id = "agree";

vbox(() => {
  button("Toggle", () => {
    agreeCheckbox.setChecked(!agreeCheckbox.checked);
  });
});
    `
  },
  {
    path: '/slider',
    code: `
const { vbox, slider, label, button } = tsyne;

const volumeSlider = slider(0, 100);
volumeSlider.id = "volume";
volumeSlider.value = 50;

const volumeLabel = label("Volume: 50");
volumeLabel.id = "volumeLabel";

vbox(() => {
  button("Set Max", () => {
    volumeSlider.value = 100;
    volumeLabel.setText("Volume: 100");
  });

  button("Set Min", () => {
    volumeSlider.value = 0;
    volumeLabel.setText("Volume: 0");
  });
});
    `
  },
  {
    path: '/enabled-disabled',
    code: `
const { vbox, button, checkbox } = tsyne;

const submitButton = button("Submit");
submitButton.id = "submit";
submitButton.disable();

const enableCheckbox = checkbox("Enable submit");
enableCheckbox.id = "enableSubmit";

vbox(() => {
  enableCheckbox.onChange(() => {
    if (enableCheckbox.checked) {
      submitButton.enable();
    } else {
      submitButton.disable();
    }
  });
});
    `
  },
  {
    path: '/widget-types',
    code: `
const { vbox, button, label, entry, checkbox } = tsyne;

vbox(() => {
  const btn = button("Click Me");
  btn.id = "myButton";

  const lbl = label("Status");
  lbl.id = "myLabel";

  const txt = entry("Enter text");
  txt.id = "myEntry";

  const chk = checkbox("Check me");
  chk.id = "myCheckbox";
});
    `
  },
  {
    path: '/visibility',
    code: `
const { vbox, label, button } = tsyne;

const hiddenLabel = label("Hidden");
hiddenLabel.id = "hidden";
hiddenLabel.hide();

const visibleLabel = label("Visible");
visibleLabel.id = "visible";

vbox(() => {
  button("Toggle", () => {
    if (hiddenLabel.visible) {
      hiddenLabel.hide();
      visibleLabel.show();
    } else {
      hiddenLabel.show();
      visibleLabel.hide();
    }
  });
});
    `
  },
  {
    path: '/delayed-state',
    code: `
const { vbox, checkbox, button, label } = tsyne;

const statusCheckbox = checkbox("Status");
statusCheckbox.id = "status";

const statusLabel = label("Unchecked");
statusLabel.id = "statusLabel";

vbox(() => {
  button("Check After Delay", () => {
    statusLabel.setText("Checking...");
    setTimeout(() => {
      statusCheckbox.setChecked(true);
      statusLabel.setText("Checked!");
    }, 1000);
  });

  button("Uncheck After Delay", () => {
    statusLabel.setText("Unchecking...");
    setTimeout(() => {
      statusCheckbox.setChecked(false);
      statusLabel.setText("Unchecked!");
    }, 1000);
  });
});
    `
  }
];

describeBrowser('Fluent Property Assertions', () => {

  browserTest(
    'should assert checkbox checked state',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/checkbox');
      const ctx = browserTest.getContext();

      // Initially unchecked
      await ctx.getById("agree").shouldNotBeChecked();

      // Toggle it
      await ctx.getByText("Toggle").click();
      await ctx.wait(50);

      // Now checked
      await ctx.getById("agree").shouldBeChecked();

      // Toggle again
      await ctx.getByText("Toggle").click();
      await ctx.wait(50);

      // Unchecked again
      await ctx.getById("agree").shouldNotBeChecked();
    }
  );

  browserTest(
    'should assert slider value',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/slider');
      const ctx = browserTest.getContext();

      // Initial value
      await ctx.getById("volume").shouldHaveValue(50);

      // Set to max
      await ctx.getByText("Set Max").click();
      await ctx.wait(50);
      await ctx.getById("volume").shouldHaveValue(100);
      await ctx.getById("volumeLabel").shouldBe("Volume: 100");

      // Set to min
      await ctx.getByText("Set Min").click();
      await ctx.wait(50);
      await ctx.getById("volume").shouldHaveValue(0);
      await ctx.getById("volumeLabel").shouldBe("Volume: 0");
    }
  );

  browserTest(
    'should assert enabled/disabled state',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/enabled-disabled');
      const ctx = browserTest.getContext();

      // Submit button starts disabled
      await ctx.getById("submit").shouldBeDisabled();

      // Enable it by checking the checkbox
      await ctx.getById("enableSubmit").click();
      await ctx.wait(50);
      await ctx.getById("submit").shouldBeEnabled();

      // Disable it again
      await ctx.getById("enableSubmit").click();
      await ctx.wait(50);
      await ctx.getById("submit").shouldBeDisabled();
    }
  );

  browserTest(
    'should assert widget types',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/widget-types');
      const ctx = browserTest.getContext();

      // Verify each widget has correct type
      await ctx.getById("myButton").shouldHaveType("button");
      await ctx.getById("myLabel").shouldHaveType("label");
      await ctx.getById("myEntry").shouldHaveType("entry");
      await ctx.getById("myCheckbox").shouldHaveType("checkbox");
    }
  );

  browserTest(
    'should assert visibility (fluent style)',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/visibility');
      const ctx = browserTest.getContext();

      // Initial state
      await ctx.getById("hidden").shouldNotBeVisible();
      await ctx.getById("visible").shouldBeVisible();

      // Toggle
      await ctx.getByText("Toggle").click();
      await ctx.wait(50);

      // Swapped visibility
      await ctx.getById("hidden").shouldBeVisible();
      await ctx.getById("visible").shouldNotBeVisible();
    }
  );

  browserTest(
    'should use within() with property assertions',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/delayed-state');
      const ctx = browserTest.getContext();

      // Start unchecked
      await ctx.getById("status").shouldNotBeChecked();

      // Click to check after delay
      await ctx.getByText("Check After Delay").click();
      await ctx.wait(50);

      // Use within() to wait for checkbox to be checked (up to 2 seconds)
      await ctx.getById("status").within(2000).shouldBeChecked();
      await ctx.getById("statusLabel").shouldBe("Checked!");

      // Click to uncheck after delay
      await ctx.getByText("Uncheck After Delay").click();
      await ctx.wait(50);

      // Use within() to wait for checkbox to be unchecked
      await ctx.getById("status").within(2000).shouldNotBeChecked();
      await ctx.getById("statusLabel").shouldBe("Unchecked!");
    }
  );

  browserTest(
    'should chain multiple property assertions',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/widget-types');
      const ctx = browserTest.getContext();

      // Chain type and visibility checks
      await ctx.getById("myButton")
        .shouldHaveType("button")
        .then(async (loc) => {
          await loc.shouldBeVisible();
        });

      await ctx.getById("myLabel")
        .shouldHaveType("label")
        .then(async (loc) => {
          await loc.shouldBe("Status");
        });
    }
  );

  browserTest(
    'should demonstrate all property assertions together',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/enabled-disabled');
      const ctx = browserTest.getContext();

      const submitBtn = ctx.getById("submit");
      const enableChk = ctx.getById("enableSubmit");

      // Multiple assertions on submit button
      await submitBtn.shouldHaveType("button");
      await submitBtn.shouldBeVisible();
      await submitBtn.shouldBeDisabled();
      await submitBtn.shouldBe("Submit");

      // Multiple assertions on checkbox
      await enableChk.shouldHaveType("checkbox");
      await enableChk.shouldBeVisible();
      await enableChk.shouldNotBeChecked();

      // Enable submit by checking checkbox
      await enableChk.click();
      await ctx.wait(50);

      // Verify state changes
      await enableChk.shouldBeChecked();
      await submitBtn.shouldBeEnabled();
    }
  );

  browserTest(
    'should use property assertions with traditional expect style',
    propertyTestPages,
    async (browserTest) => {
      await browserTest.createBrowser('/checkbox');
      const ctx = browserTest.getContext();

      // Fluent style
      await ctx.getById("agree").shouldNotBeChecked();

      // Can also use traditional expect style for consistency
      await ctx.expect(ctx.getById("agree")).toBeVisible();

      // Toggle
      await ctx.getByText("Toggle").click();
      await ctx.wait(50);

      // Mix fluent and traditional
      await ctx.getById("agree").shouldBeChecked();
      await ctx.expect(ctx.getById("agree")).toExist();
    }
  );
});

// Run tests if this file is executed directly
if (require.main === module) {
  runBrowserTests().catch(console.error);
}
