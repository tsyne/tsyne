// Form Demo Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/form

const { vbox, hbox, label, button, entry, checkbox, select, slider } = tsyne;

let nameEntry;
let ageEntry;
let subscribeCheckbox;
let countrySelect;
let ratingSlider;

vbox(() => {
  label('Form Widget Demo');
  label('');

  label('Name:');
  nameEntry = entry('Enter your name');
  label('');

  label('Age:');
  ageEntry = entry('25');
  label('');

  subscribeCheckbox = checkbox('Subscribe to newsletter');
  label('');

  label('Country:');
  countrySelect = select(['USA', 'UK', 'Canada', 'Australia', 'Other']);
  label('');

  label('Rating (1-5):');
  ratingSlider = slider(1, 5, 3);
  label('');

  hbox(() => {
    button('Submit', async () => {
      const name = await nameEntry.getText();
      const age = await ageEntry.getText();
      const subscribe = await subscribeCheckbox.getChecked();
      const country = await countrySelect.getSelected();
      const rating = await ratingSlider.getValue();

      console.log('Form submitted:');
      console.log('  Name:', name);
      console.log('  Age:', age);
      console.log('  Subscribe:', subscribe);
      console.log('  Country:', country);
      console.log('  Rating:', rating);

      browserContext.changePage('/thanks');
    });

    button('Home', () => {
      browserContext.changePage('/');
    });
  });
});
