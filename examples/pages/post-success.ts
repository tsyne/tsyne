// POST Success Page - Confirmation after form submission
// URL: http://localhost:3000/post-success?name=John
// Feature: Success page after POST-Redirect-GET

const { vbox, label, button, separator } = tsyne;

// Extract name from URL (simulating server-side rendering with query param)
const url = browserContext.currentUrl;
const nameMatch = url.match(/name=([^&]*)/);
const userName = nameMatch ? decodeURIComponent(nameMatch[1]) : 'User';

vbox(() => {
  label('✓ Registration Successful!');
  separator();
  label('');
  label(`Thank you, ${userName}!`);
  label('');
  label('Your registration has been submitted.');
  label('');
  label('In a real application:');
  label('  • Server would save your data to database');
  label('  • Confirmation email would be sent');
  label('  • Session would be created');
  label('');
  separator();
  label('');
  label('This demonstrates the POST-Redirect-GET pattern:');
  label('  1. Form submitted (/post-demo)');
  label('  2. Data validated');
  label('  3. Redirected to success page (this page)');
  label('  4. Success page displays confirmation');
  label('');
  label('Try refreshing: You\'ll just reload this success page,');
  label('not resubmit the form. This prevents duplicate submissions!');
  label('');

  separator();

  button('Submit Another Form', () => {
    browserContext.changePage('/post-demo');
  });

  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
