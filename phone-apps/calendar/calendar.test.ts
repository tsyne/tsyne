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
 * Tests for Calendar App
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createCalendarApp } from './calendar';
import { MockCalendarService } from './calendar-service';

describe('Calendar App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let calendar: MockCalendarService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    calendar = new MockCalendarService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display calendar title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('calendar-title').within(500).shouldExist();
  });

  test('should display current month', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Month display should show current month and year
    await ctx.getById('month-display').within(500).shouldExist();
  });

  test('should have month navigation buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('btn-prev-month').within(500).shouldExist();
    await ctx.getById('btn-next-month').within(500).shouldExist();
  });

  test('should have today button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('btn-today').within(500).shouldExist();
  });

  test('should have new event button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('btn-new-event').within(500).shouldExist();
  });

  test('should display weekday headers', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // At least some weekday headers should be visible
    await ctx.getById('weekday-Mon').within(500).shouldExist();
  });

  test('should display events section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('label-events-section').within(500).shouldExist();
  });

  test('should show today events when calendar loads', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calendar has sample events for today
    const todayEvents = calendar.getTodayEvents();
    expect(todayEvents.length).toBeGreaterThan(0);
  });

  test('should create new event', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const before = calendar.getTodayEvents().length;

    // Click new event button
    await ctx.getById('btn-new-event').click();

    const after = calendar.getTodayEvents().length;
    expect(after).toBeGreaterThan(before);
  });

  test('should navigate months', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialMonth = calendar.getCurrentMonth();

    // Navigate to next month
    await ctx.getById('btn-next-month').click();
    const nextMonth = calendar.getCurrentMonth();

    expect(nextMonth.month).not.toBe(initialMonth.month);
  });

  test('should navigate to today', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to next month
    await ctx.getById('btn-next-month').click();
    let currentMonth = calendar.getCurrentMonth();
    const now = new Date();

    if (currentMonth.month !== now.getMonth() || currentMonth.year !== now.getFullYear()) {
      // Clicked today
      await ctx.getById('btn-today').click();
      currentMonth = calendar.getCurrentMonth();

      // Should be back to current month
      expect(currentMonth.month).toBe(now.getMonth());
      expect(currentMonth.year).toBe(now.getFullYear());
    }
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createCalendarApp(app, calendar);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Calendar screenshot saved: ${screenshot}`);
    }
  });
});

/**
 * Unit tests for MockCalendarService
 */
describe('MockCalendarService', () => {
  let service: MockCalendarService;

  beforeEach(() => {
    service = new MockCalendarService();
  });

  test('should initialize with current date', () => {
    const today = service.getToday();
    expect(today).toBeDefined();
    expect(today.getTime()).toBeLessThanOrEqual(new Date().getTime());
  });

  test('should have sample events', () => {
    const events = service.getTodayEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  test('should add event', () => {
    const before = service.getTodayEvents().length;

    const event = service.addEvent({
      title: 'Test Event',
      date: service.getToday(),
      startTime: '15:00',
      endTime: '16:00',
      allDay: false,
      color: '#FF0000',
    });

    const after = service.getTodayEvents().length;
    expect(after).toBe(before + 1);
    expect(event.id).toBeTruthy();
  });

  test('should update event', () => {
    const events = service.getTodayEvents();
    const event = events[0];

    const updated = service.updateEvent(event.id, { title: 'Updated Title' });
    expect(updated?.title).toBe('Updated Title');
  });

  test('should delete event', () => {
    const events = service.getTodayEvents();
    const before = events.length;

    service.deleteEvent(events[0].id);
    const after = service.getTodayEvents().length;

    expect(after).toBe(before - 1);
  });

  test('should get event by id', () => {
    const events = service.getTodayEvents();
    const event = events[0];

    const retrieved = service.getEvent(event.id);
    expect(retrieved?.id).toBe(event.id);
  });

  test('should get events for specific date', () => {
    const today = service.getToday();
    const events = service.getEventsForDate(today);
    expect(Array.isArray(events)).toBe(true);
  });

  test('should get upcoming events', () => {
    const upcoming = service.getUpcomingEvents(7);
    expect(Array.isArray(upcoming)).toBe(true);
    expect(upcoming.length).toBeGreaterThan(0);
  });

  test('should get events by month', () => {
    const now = new Date();
    const events = service.getEventsByMonth(now.getFullYear(), now.getMonth());
    expect(Array.isArray(events)).toBe(true);
  });

  test('should search events', () => {
    const results = service.searchEvents('meeting');
    expect(Array.isArray(results)).toBe(true);
  });

  test('should search case-insensitive', () => {
    const results = service.searchEvents('MEETING');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should get current month calendar', () => {
    const month = service.getCurrentMonth();
    expect(month.weeks).toBeDefined();
    expect(month.weeks.length).toBeGreaterThan(0);
  });

  test('should navigate to next month', () => {
    const current = service.getCurrentMonth();
    const next = service.nextMonth();

    const nextMonthExpected = current.month === 11 ? 0 : current.month + 1;
    expect(next.month).toBe(nextMonthExpected);
  });

  test('should navigate to previous month', () => {
    service.nextMonth();
    const current = service.getCurrentMonth();
    const previous = service.previousMonth();

    const prevMonthExpected = current.month === 0 ? 11 : current.month - 1;
    expect(previous.month).toBe(prevMonthExpected);
  });

  test('should go to specific date', () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    const month = service.goToDate(date);

    expect(month.month).toBe(5);
    expect(month.year).toBe(2024);
  });

  test('should set view mode', () => {
    service.setViewMode('week');
    expect(service.getViewMode()).toBe('week');

    service.setViewMode('day');
    expect(service.getViewMode()).toBe('day');

    service.setViewMode('month');
    expect(service.getViewMode()).toBe('month');
  });

  test('should notify on event added', async () => {
    const added: string[] = [];
    service.onEventAdded((event) => added.push(event.title));

    service.addEvent({
      title: 'Event 1',
      date: service.getToday(),
      startTime: '10:00',
      endTime: '11:00',
      allDay: false,
      color: '#FF0000',
    });

    expect(added).toContain('Event 1');
  });

  test('should notify on event updated', () => {
    const updated: string[] = [];
    service.onEventUpdated((event) => updated.push(event.title));

    const events = service.getTodayEvents();
    service.updateEvent(events[0].id, { title: 'Updated Event' });

    expect(updated).toContain('Updated Event');
  });

  test('should notify on event deleted', () => {
    const deleted: string[] = [];
    service.onEventDeleted((eventId) => deleted.push(eventId));

    const events = service.getTodayEvents();
    service.deleteEvent(events[0].id);

    expect(deleted.length).toBeGreaterThan(0);
  });

  test('should handle all-day events', () => {
    const event = service.addEvent({
      title: 'All Day Event',
      date: service.getToday(),
      allDay: true,
      color: '#00FF00',
    });

    expect(event.allDay).toBe(true);
  });

  test('should sort events by time', () => {
    const today = service.getToday();
    service.deleteEvent('event-1'); // Clear sample events first

    service.addEvent({
      title: 'Event 1',
      date: today,
      startTime: '14:00',
      endTime: '15:00',
      allDay: false,
      color: '#FF0000',
    });

    service.addEvent({
      title: 'Event 2',
      date: today,
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      color: '#FF0000',
    });

    const events = service.getEventsForDate(today);
    if (events.length >= 2) {
      // Find our two events
      const event1 = events.find(e => e.title === 'Event 1');
      const event2 = events.find(e => e.title === 'Event 2');

      if (event1 && event2) {
        const idx1 = events.indexOf(event1);
        const idx2 = events.indexOf(event2);
        expect(idx2).toBeLessThan(idx1); // Event 2 (09:00) should come before Event 1 (14:00)
      }
    }
  });
});
