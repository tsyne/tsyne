/**
 * Country Picker Demo
 *
 * Demonstrates the SelectEntry widget - a searchable dropdown that combines
 * a text entry with a dropdown menu. Users can type to filter options or
 * select from the dropdown list.
 */
import { app } from '../src';

// Sample list of countries
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China',
  'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt',
  'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany',
  'Ghana', 'Greece', 'Guatemala', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Mexico', 'Morocco', 'Nepal', 'Netherlands',
  'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Panama',
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'Slovakia',
  'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Turkey',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

// Track selected country
let selectedCountry = '';
let statusLabel: any;

app({ title: 'Country Picker' }, (a) => {
  a.window({ title: 'Country Picker - SelectEntry Demo', width: 500, height: 400 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Select your country:');

        // Create the searchable dropdown
        a.selectentry(
          countries,
          'Type to search countries...',
          (text) => {
            // onChanged - fires when user types
            console.log(`Typing: ${text}`);
          },
          (text) => {
            // onSubmitted - fires when user presses Enter
            selectedCountry = text;
            console.log(`Submitted: ${text}`);
            if (statusLabel) {
              statusLabel.setText(`You submitted: ${text}`);
            }
          },
          (selected) => {
            // onSelected - fires when user selects from dropdown
            selectedCountry = selected;
            console.log(`Selected from dropdown: ${selected}`);
            if (statusLabel) {
              statusLabel.setText(`Selected: ${selected}`);
            }
          }
        );

        a.separator();

        // Status label to show selection
        statusLabel = a.label('No country selected yet');

        a.separator();

        // Button to show current selection
        a.button('Show Selection', () => {
          if (selectedCountry) {
            console.log(`Current selection: ${selectedCountry}`);
          } else {
            console.log('No country selected');
          }
        });

        // Exit button
        a.button('Exit', () => {
          process.exit(0);
        });
      });
    });
    win.show();
  });
});
