// Custom Alert Page - Example of alert as a page
// URL: http://localhost:3000/custom-alert?title=...&message=...
// Feature: Custom alert page instead of modal dialog

const { vbox, label, button, separator } = tsyne;

// Parse query parameters
const url = browserContext.currentUrl;
const titleMatch = url.match(/title=([^&]*)/);
const messageMatch = url.match(/message=([^&]*)/);

const title = titleMatch ? decodeURIComponent(titleMatch[1]) : 'Alert';
const message = messageMatch ? decodeURIComponent(messageMatch[1]) : 'No message provided';

vbox(() => {
  label('');
  label('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  label('');
  label(title);
  label('');
  label('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  label('');
  label(message);
  label('');
  label('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  label('');

  button('OK').onClick(() => {
    // Go back to previous page
    browserContext.back();
  });

  label('');
  separator();
  label('');
  label('This is a custom alert page.');
  label('');
  label('Instead of a modal dialog (like JavaScript alert()),');
  label('this uses a dedicated page to display the message.');
  label('');
  label('Benefits:');
  label('  • Full page layout control');
  label('  • Can include complex content');
  label('  • Fits browser navigation model');
  label('  • Bookmarkable alerts (for testing)');
  label('');
  label('Usage:');
  label('  browserContext.changePage(');
  label('    \'/custom-alert?title=Warning&message=Low+disk+space\'');
  label('  );');
});
