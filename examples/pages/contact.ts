// Contact Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/contact

const { vbox, hbox, label, button, entry } = tsyne;

let nameEntry;
let emailEntry;
let messageEntry;

vbox(() => {
  label('Contact Us');
  label('');

  label('Name:');
  nameEntry = entry('Your name');
  label('');

  label('Email:');
  emailEntry = entry('your@email.com');
  label('');

  label('Message:');
  messageEntry = entry('Your message');
  label('');

  hbox(() => {
    button('Submit', async () => {
      const name = await nameEntry.getText();
      const email = await emailEntry.getText();
      const message = await messageEntry.getText();

      console.log('Contact form submitted:');
      console.log('  Name:', name);
      console.log('  Email:', email);
      console.log('  Message:', message);

      browserContext.changePage('/thanks');
    });

    button('Cancel', () => {
      browserContext.back();
    });
  });
});
