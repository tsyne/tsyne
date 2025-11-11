// Widget Interactions Test Page - Comprehensive testing of all interactive widgets
// URL: http://localhost:3000/widget-interactions
// This page tests: checkbox, entry, select, slider, radiogroup, list, progressbar

const { vbox, hbox, label, button, checkbox, entry, multilineentry, passwordentry, select, slider, radiogroup, list, progressbar, separator } = tsyne;

// State tracking for all widgets
let checkboxWidget;
let checkboxState = false;
let checkboxCallbackCount = 0;
let checkboxStateLabel;

let entryWidget;
let entryStateLabel;

let multilineWidget;
let multilineStateLabel;

let passwordWidget;
let passwordStateLabel;

let selectWidget;
let selectState = 'Option 1';
let selectCallbackCount = 0;
let selectStateLabel;

let sliderWidget;
let sliderState = 50;
let sliderCallbackCount = 0;
let sliderStateLabel;

let radiogroupWidget;
let radiogroupState = 'Red';
let radiogroupCallbackCount = 0;
let radiogroupStateLabel;

let listCallbackCount = 0;
let listSelectedIndex = -1;
let listSelectedItem = '';
let listStateLabel;

let progressWidget;
let progressStateLabel;

vbox(() => {
  label('Widget Interactions Test Page');
  label('This page tests all interactive widgets');
  separator();

  // ===== CHECKBOX TEST =====
  label('');
  label('=== Checkbox Test ===');
  checkboxWidget = checkbox('Enable feature', (checked) => {
    checkboxState = checked;
    checkboxCallbackCount++;
    if (checkboxStateLabel) {
      checkboxStateLabel.setText(`Checkbox state: ${checked} (callbacks: ${checkboxCallbackCount})`);
    }
  });
  checkboxStateLabel = label(`Checkbox state: ${checkboxState} (callbacks: ${checkboxCallbackCount})`);

  button('Verify Checkbox State', async () => {
    const checked = await checkboxWidget.getChecked();
    console.log('Checkbox getChecked():', checked);
    console.log('Checkbox state variable:', checkboxState);
    console.log('Checkbox callback count:', checkboxCallbackCount);
  });

  separator();

  // ===== ENTRY TEST =====
  label('');
  label('=== Entry (Text Input) Test ===');
  entryWidget = entry('Type something here');
  entryStateLabel = label('Entry text: (empty)');

  button('Read Entry Text', async () => {
    const text = await entryWidget.getText();
    console.log('Entry getText():', text);
    if (entryStateLabel) {
      entryStateLabel.setText(`Entry text: "${text}"`);
    }
  });

  separator();

  // ===== MULTILINE ENTRY TEST =====
  label('');
  label('=== MultiLine Entry Test ===');
  multilineWidget = multilineentry('Type multiple lines here', 'word');
  multilineStateLabel = label('MultiLine text: (empty)');

  button('Read MultiLine Text', async () => {
    const text = await multilineWidget.getText();
    console.log('MultiLine getText():', text);
    if (multilineStateLabel) {
      multilineStateLabel.setText(`MultiLine text: "${text}"`);
    }
  });

  separator();

  // ===== PASSWORD ENTRY TEST =====
  label('');
  label('=== Password Entry Test ===');
  passwordWidget = passwordentry('Enter password');
  passwordStateLabel = label('Password text: (empty)');

  button('Read Password Text', async () => {
    const text = await passwordWidget.getText();
    console.log('Password getText():', text);
    if (passwordStateLabel) {
      passwordStateLabel.setText(`Password text: "${text}" (length: ${text.length})`);
    }
  });

  separator();

  // ===== SELECT TEST =====
  label('');
  label('=== Select (Dropdown) Test ===');
  selectWidget = select(['Option 1', 'Option 2', 'Option 3', 'Option 4'], (selected) => {
    selectState = selected;
    selectCallbackCount++;
    if (selectStateLabel) {
      selectStateLabel.setText(`Select state: ${selected} (callbacks: ${selectCallbackCount})`);
    }
  });
  selectStateLabel = label(`Select state: ${selectState} (callbacks: ${selectCallbackCount})`);

  button('Verify Select State', async () => {
    const selected = await selectWidget.getSelected();
    console.log('Select getSelected():', selected);
    console.log('Select state variable:', selectState);
    console.log('Select callback count:', selectCallbackCount);
  });

  separator();

  // ===== SLIDER TEST =====
  label('');
  label('=== Slider Test ===');
  sliderWidget = slider(0, 100, 50, (value) => {
    sliderState = value;
    sliderCallbackCount++;
    if (sliderStateLabel) {
      sliderStateLabel.setText(`Slider state: ${value} (callbacks: ${sliderCallbackCount})`);
    }
  });
  sliderStateLabel = label(`Slider state: ${sliderState} (callbacks: ${sliderCallbackCount})`);

  button('Verify Slider State', async () => {
    const value = await sliderWidget.getValue();
    console.log('Slider getValue():', value);
    console.log('Slider state variable:', sliderState);
    console.log('Slider callback count:', sliderCallbackCount);
  });

  separator();

  // ===== RADIOGROUP TEST =====
  label('');
  label('=== RadioGroup Test ===');
  radiogroupWidget = radiogroup(['Red', 'Green', 'Blue', 'Yellow'], 'Red', (selected) => {
    radiogroupState = selected;
    radiogroupCallbackCount++;
    if (radiogroupStateLabel) {
      radiogroupStateLabel.setText(`RadioGroup state: ${selected} (callbacks: ${radiogroupCallbackCount})`);
    }
  });
  radiogroupStateLabel = label(`RadioGroup state: ${radiogroupState} (callbacks: ${radiogroupCallbackCount})`);

  button('Verify RadioGroup State', async () => {
    const selected = await radiogroupWidget.getSelected();
    console.log('RadioGroup getSelected():', selected);
    console.log('RadioGroup state variable:', radiogroupState);
    console.log('RadioGroup callback count:', radiogroupCallbackCount);
  });

  separator();

  // ===== LIST TEST =====
  label('');
  label('=== List Test ===');
  list(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'], (index, item) => {
    listCallbackCount++;
    listSelectedIndex = index;
    listSelectedItem = item;
    if (listStateLabel) {
      listStateLabel.setText(`List selected: index=${index}, item="${item}" (callbacks: ${listCallbackCount})`);
    }
    console.log('List selection callback:', index, item);
  });
  listStateLabel = label(`List selected: none (callbacks: ${listCallbackCount})`);

  separator();

  // ===== PROGRESSBAR TEST =====
  label('');
  label('=== ProgressBar Test ===');
  progressWidget = progressbar(0.5); // Start at 50%
  progressStateLabel = label('Progress: 50%');

  hbox(() => {
    button('Set 0%', async () => {
      await progressWidget.setProgress(0);
      const value = await progressWidget.getProgress();
      if (progressStateLabel) {
        progressStateLabel.setText(`Progress: ${Math.round(value * 100)}%`);
      }
      console.log('Progress set to:', value);
    });

    button('Set 25%', async () => {
      await progressWidget.setProgress(0.25);
      const value = await progressWidget.getProgress();
      if (progressStateLabel) {
        progressStateLabel.setText(`Progress: ${Math.round(value * 100)}%`);
      }
      console.log('Progress set to:', value);
    });

    button('Set 50%', async () => {
      await progressWidget.setProgress(0.5);
      const value = await progressWidget.getProgress();
      if (progressStateLabel) {
        progressStateLabel.setText(`Progress: ${Math.round(value * 100)}%`);
      }
      console.log('Progress set to:', value);
    });

    button('Set 75%', async () => {
      await progressWidget.setProgress(0.75);
      const value = await progressWidget.getProgress();
      if (progressStateLabel) {
        progressStateLabel.setText(`Progress: ${Math.round(value * 100)}%`);
      }
      console.log('Progress set to:', value);
    });

    button('Set 100%', async () => {
      await progressWidget.setProgress(1.0);
      const value = await progressWidget.getProgress();
      if (progressStateLabel) {
        progressStateLabel.setText(`Progress: ${Math.round(value * 100)}%`);
      }
      console.log('Progress set to:', value);
    });
  });

  separator();
  label('');
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
