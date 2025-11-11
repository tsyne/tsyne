// POST-Redirect-GET Demo Page - Demonstrates form submission pattern
// URL: http://localhost:3000/post-demo
// Feature: POST-Redirect-GET pattern (standard web pattern)

const { vbox, scroll, label, button, separator, entry, checkbox } = tsyne;

let nameEntry;
let emailEntry;
let agreeCheckbox;

vbox(() => {
  label('POST-Redirect-GET Demo');
  label('This page demonstrates the POST-Redirect-GET pattern');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== Registration Form ===');
      label('Fill out this form and submit:');
      label('');

      label('Name:');
      nameEntry = entry('Your full name');
      label('');

      label('Email:');
      emailEntry = entry('your@email.com');
      label('');

      agreeCheckbox = checkbox('I agree to the terms and conditions');
      label('');

      button('Submit Registration', async () => {
        const name = await nameEntry.getText();
        const email = await emailEntry.getText();
        const agreed = await agreeCheckbox.getChecked();

        console.log('Form submission:');
        console.log('  Name:', name);
        console.log('  Email:', email);
        console.log('  Agreed:', agreed);

        if (!name || !email) {
          console.log('Validation failed: Name and email required');
          // In a real app, show validation error
          return;
        }

        if (!agreed) {
          console.log('Validation failed: Must agree to terms');
          // In a real app, show validation error
          return;
        }

        // Simulate POST-Redirect-GET:
        // 1. Client submits form (POST)
        // 2. Server processes data
        // 3. Server redirects to success page (GET)
        // 4. Success page loads with confirmation

        // In Tsyne, we navigate to a success page
        // In a real implementation with server state:
        //   - Server would store submission
        //   - Success page would fetch from server
        browserContext.changePage('/post-success?name=' + encodeURIComponent(name));
      });

      label('');
      separator();
      label('');

      label('=== POST-Redirect-GET Pattern ===');
      label('');
      label('Traditional Web Flow:');
      label('  1. User fills form and clicks Submit');
      label('  2. Browser sends POST request to server');
      label('  3. Server validates and saves data');
      label('  4. Server sends 302 redirect to success page');
      label('  5. Browser follows redirect with GET request');
      label('  6. Success page loads with confirmation');
      label('');
      label('Benefits:');
      label('  • Prevents duplicate submissions (refresh = reload success page)');
      label('  • Clean URL in browser after submission');
      label('  • Proper separation of POST (mutation) and GET (view)');
      label('');

      separator();
      label('');

      label('=== Tsyne Implementation ===');
      label('');
      label('In Tsyne:');
      label('  1. User fills form and clicks button');
      label('  2. Handler validates data client-side');
      label('  3. Handler calls browserContext.changePage(\'/success\')');
      label('  4. Server generates success page with data');
      label('  5. Success page loads');
      label('');
      label('For server-side processing:');
      label('  • Use Express/Node.js server (see server-express.js)');
      label('  • Server maintains session state');
      label('  • Success page includes data from session');
      label('');

      separator();
      label('');

      label('=== HTTP Methods ===');
      label('');
      label('Tsyne Browser uses:');
      label('  • GET for all page loads (browserContext.changePage)');
      label('  • Server can simulate POST by:');
      label('    - Accepting query parameters (?key=value)');
      label('    - Using session storage');
      label('    - Generating dynamic pages based on state');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
