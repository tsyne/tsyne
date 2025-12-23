/**
 * Appointment Scheduler - Date selection UI with Calendar widget
 *
 * This example demonstrates the standalone Calendar widget which shows
 * a full calendar month view for inline date selection.
 *
 * Run: npx tsx examples/appointment-scheduler.ts
 */
import { app, resolveTransport  } from '../core/src/index';

// Sample appointments
interface Appointment {
  date: string;
  time: string;
  title: string;
}

const appointments: Appointment[] = [
  { date: '2025-11-25', time: '09:00', title: 'Team Meeting' },
  { date: '2025-11-25', time: '14:00', title: 'Project Review' },
  { date: '2025-11-27', time: '10:30', title: 'Client Call' },
  { date: '2025-11-28', time: '15:00', title: 'Training Session' },
];

app(resolveTransport(), { title: 'Tsyne Appointment Scheduler' }, (a) => {
  a.window({ title: 'Appointment Scheduler', width: 700, height: 500 }, (win) => {
    let selectedDate = new Date().toISOString().split('T')[0]; // Today's date
    let dateLabel: any;
    let appointmentContainer: any;

    // Function to get appointments for a date
    const getAppointmentsForDate = (date: string): Appointment[] => {
      return appointments.filter(apt => apt.date === date);
    };

    // Function to update the appointment list display
    const updateAppointmentList = async (date: string) => {
      if (dateLabel) {
        await dateLabel.setText(`Appointments for ${date}`);
      }
    };

    win.setContent(() => {
      a.hbox(() => {
        // Left side: Calendar
        a.vbox(() => {
          a.label('Select a Date', undefined, 'center', undefined, { bold: true });
          a.separator();

          // Standalone calendar widget
          a.calendar(selectedDate, async (date) => {
            selectedDate = date;
            await updateAppointmentList(date);
            console.log(`Selected date: ${date}`);
          });
        });

        a.separator();

        // Right side: Appointments list
        a.vbox(() => {
          dateLabel = a.label(`Appointments for ${selectedDate}`, undefined, 'center', undefined, { bold: true });
          a.separator();

          a.scroll(() => {
            appointmentContainer = a.vbox(() => {
              // Show sample appointments
              const todayAppointments = getAppointmentsForDate(selectedDate);
              if (todayAppointments.length === 0) {
                a.label('No appointments for this date');
              } else {
                for (const apt of todayAppointments) {
                  a.card(apt.title, apt.time, () => {
                    a.hbox(() => {
                      a.icon('info');
                      a.label(`${apt.time} - ${apt.title}`);
                    });
                  });
                }
              }
            });
          });

          a.separator();

          // Action buttons
          a.hbox(() => {
            a.button('Add Appointment').onClick(() => {
              console.log(`Adding appointment for ${selectedDate}`);
            });
            a.button('View All').onClick(() => {
              console.log('Viewing all appointments');
              appointments.forEach(apt => {
                console.log(`  ${apt.date} ${apt.time}: ${apt.title}`);
              });
            });
          });
        });
      });
    });
    win.show();
  });
});
