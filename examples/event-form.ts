// Event Form Demo - Demonstrates DateEntry widget for event creation
// This example shows how to use the DateEntry widget for date selection

import { app, resolveTransport, dialog  } from '../core/src';

app(resolveTransport(), { title: 'Event Form' }, (a) => {
  a.window({ title: 'Create Event', width: 450, height: 400 }, (win) => {
    let eventNameEntry: any;
    let eventDateEntry: any;
    let eventEndDateEntry: any;
    let eventDescriptionEntry: any;
    let allDayCheckbox: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Create New Event', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Event Name
        a.hbox(() => {
          a.label('Event Name:');
        });
        eventNameEntry = a.entry('Enter event name');

        // Event Date
        a.hbox(() => {
          a.label('Start Date:');
        });
        eventDateEntry = a.dateentry(undefined, (date: string) => {
          console.log('Start date changed to:', date);
        });

        // End Date
        a.hbox(() => {
          a.label('End Date:');
        });
        eventEndDateEntry = a.dateentry(undefined, (date: string) => {
          console.log('End date changed to:', date);
        });

        // All day checkbox
        allDayCheckbox = a.checkbox('All day event', (checked: boolean) => {
          console.log('All day:', checked);
        });

        // Description
        a.hbox(() => {
          a.label('Description:');
        });
        eventDescriptionEntry = a.multilineentry('Enter event description...');

        a.separator();

        // Buttons
        a.hbox(() => {
          a.button('Create Event').onClick(async () => {
            const name = await eventNameEntry.getText();
            const startDate = await eventDateEntry.getDate();
            const endDate = await eventEndDateEntry.getDate();
            const description = await eventDescriptionEntry.getText();
            const allDay = await allDayCheckbox.getChecked();

            if (!name) {
              dialog.showError(win, 'Validation Error', 'Please enter an event name.');
              return;
            }

            if (!startDate) {
              dialog.showError(win, 'Validation Error', 'Please select a start date.');
              return;
            }

            // Create summary
            let summary = `Event: ${name}\n`;
            summary += `Start: ${startDate}\n`;
            if (endDate) {
              summary += `End: ${endDate}\n`;
            }
            summary += `All Day: ${allDay ? 'Yes' : 'No'}\n`;
            if (description) {
              summary += `\nDescription:\n${description}`;
            }

            dialog.showInformation(win, 'Event Created', summary);
          });

          a.button('Set Today').onClick(async () => {
            // Set today's date
            const today = new Date().toISOString().split('T')[0];
            await eventDateEntry.setDate(today);
            await eventEndDateEntry.setDate(today);
          });

          a.button('Clear Dates').onClick(async () => {
            await eventDateEntry.setDate('');
            await eventEndDateEntry.setDate('');
          });

          a.button('Cancel').onClick(() => {
            win.close();
          });
        });
      });
    });
    win.show();
  });
});
