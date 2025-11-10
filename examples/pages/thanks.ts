// Thank You Page - TypeScript content for Tsyne Browser
// URL: http://localhost:3000/thanks

const { vbox, label, button, separator } = tsyne;

vbox(() => {
  label('Thank You!');
  separator();
  label('');
  label('Your submission has been received.');
  label('');
  label('(Check the console for submitted data)');
  label('');

  button('Back to Home', () => {
    browserContext.changePage('/');
  });

  button('Go Back', () => {
    browserContext.back();
  });
});
