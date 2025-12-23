/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * Calendar App
 *
 * A calendar with event management, month view, and event listing.
 * Implements pseudo-declarative pattern following calculator.ts style.
 *
 * @tsyne-app:name Calendar
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createCalendarApp
 * @tsyne-app:args app,calendar
 * @tsyne-app:count single
 */

import { app, resolveTransport, styles, FontStyle  } from '../../core/src';
import type { App } from '../../core/src';
import type { Window } from '../../core/src';
import type { Label } from '../../core/src';
import type { VBox } from '../../core/src';
import { ICalendarService, MockCalendarService, CalendarMonth, CalendarDay } from './calendar-service';

// Define calendar styles
styles({
  'calendar-title': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 22,
  },
  'calendar-header': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 18,
  },
  'calendar-day-header': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 12,
  },
  'calendar-today': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 14,
  },
});

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Build the calendar UI - Pseudo-declarative style
 */
export function createCalendarApp(a: App, calendar: ICalendarService): void {
  // Instance-local state
  let monthDisplay: Label | undefined;
  let calendarGrid: VBox | undefined;
  let eventsList: VBox | undefined;
  let currentMonth: CalendarMonth;

  // Subscribe to calendar service events
  const unsubscribeAdded = calendar.onEventAdded(() => refreshCalendar());
  const unsubscribeUpdated = calendar.onEventUpdated(() => refreshCalendar());
  const unsubscribeDeleted = calendar.onEventDeleted(() => refreshCalendar());

  currentMonth = calendar.getCurrentMonth();

  function updateMonthDisplay() {
    const month = MONTH_NAMES[currentMonth.month];
    if (monthDisplay) {
      monthDisplay.setText(`${month} ${currentMonth.year}`);
    }
  }

  function renderCalendar() {
    if (!calendarGrid) return;

    // Simplified: clear and rebuild
    calendarGrid.destroyChildren?.();

    // Weekday headers
    a.hbox(() => {
      WEEKDAY_NAMES.forEach(day => {
        a.label(day).withId(`weekday-${day}`);
      });
    });

    // Calendar grid
    currentMonth.weeks.forEach((week, weekIndex) => {
      a.hbox(() => {
        week.forEach((day, dayIndex) => {
          const dateStr = day.date.getDate();
          const hasEvents = day.events.length > 0;
          const cellLabel = `${dateStr}${hasEvents ? ' •' : ''}`;
          const id = `day-${weekIndex}-${dayIndex}`;

          let labelText = cellLabel;
          if (!day.isCurrentMonth) {
            labelText = '';
          }

          a.label(labelText)
            .withId(id);
        });
      });
    });
  }

  function refreshEventsList() {
    if (!eventsList) return;

    // Simplified: clear and rebuild
    eventsList.destroyChildren?.();

    const todayEvents = calendar.getTodayEvents();
    const upcomingEvents = calendar.getUpcomingEvents(7);

    if (todayEvents.length > 0) {
      a.label('Today').withId('label-today-events');
      todayEvents.forEach((event, index) => {
        const timeStr = event.allDay ? 'All Day' : `${event.startTime} - ${event.endTime}`;
        a.hbox(() => {
          a.vbox(() => {
            a.label(event.title).withId(`today-event-${index}-title`);
            a.label(timeStr).withId(`today-event-${index}-time`);
          });
          a.spacer();
          a.button('✕').onClick(() => {
            calendar.deleteEvent(event.id);
          }).withId(`today-event-${index}-delete`);
        });
      });
    }

    const otherUpcoming = upcomingEvents.filter(
      e => !todayEvents.find(te => te.id === e.id)
    ).slice(0, 5);

    if (otherUpcoming.length > 0) {
      a.label('Upcoming (7 days)').withId('label-upcoming-events');
      otherUpcoming.forEach((event, index) => {
        const dateStr = event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = event.allDay ? 'All Day' : `${event.startTime}`;
        a.hbox(() => {
          a.vbox(() => {
            a.label(event.title).withId(`upcoming-event-${index}-title`);
            a.label(`${dateStr} - ${timeStr}`).withId(`upcoming-event-${index}-date`);
          });
          a.spacer();
          a.button('✕').onClick(() => {
            calendar.deleteEvent(event.id);
          }).withId(`upcoming-event-${index}-delete`);
        });
      });
    }

    if (todayEvents.length === 0 && otherUpcoming.length === 0) {
      a.label('No events scheduled').withId('label-no-events');
    }
  }

  function refreshCalendar() {
    updateMonthDisplay();
    renderCalendar();
    refreshEventsList();
  }

  a.window({ title: 'Calendar', width: 450, height: 700 }, (win: Window) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('📅 Calendar').withId('calendar-title');

        a.separator();

        // Month navigation
        a.hbox(() => {
          a.button('◀ Prev').onClick(() => {
            currentMonth = calendar.previousMonth();
            refreshCalendar();
          }).withId('btn-prev-month');

          monthDisplay = a.label('').withId('month-display');

          a.button('Next ▶').onClick(() => {
            currentMonth = calendar.nextMonth();
            refreshCalendar();
          }).withId('btn-next-month');
        });

        a.button('Today').onClick(() => {
          currentMonth = calendar.goToDate(calendar.getToday());
          refreshCalendar();
        }).withId('btn-today');

        a.separator();

        // Calendar grid (month view)
        calendarGrid = a.vbox(() => {
          // Calendar will be rendered by refreshCalendar()
        }) as any;

        a.separator();

        // New event button
        a.button('+ New Event').onClick(() => {
          // In a real app, this would open a form dialog
          const newEvent = calendar.addEvent({
            title: 'New Event',
            date: calendar.getToday(),
            startTime: '10:00',
            endTime: '11:00',
            allDay: false,
            color: '#95E1D3',
          });
          refreshCalendar();
        }).withId('btn-new-event');

        a.separator();

        // Events list
        a.label('Events').withId('label-events-section');
        a.scroll(() => {
          eventsList = a.vbox(() => {
            // Events will be rendered by refreshCalendar()
          }) as any;
        });
      });
    });

    win.show();

    // Initial display
    refreshCalendar();
  });

  // Cleanup function
  const cleanup = () => {
    unsubscribeAdded();
    unsubscribeUpdated();
    unsubscribeDeleted();
  };

  return cleanup as any;
}

// Standalone execution
if (require.main === module) {
  app(resolveTransport(), { title: 'Calendar' }, (a: App) => {
    const calendarService = new MockCalendarService();
    createCalendarApp(a, calendarService);
  });
}
