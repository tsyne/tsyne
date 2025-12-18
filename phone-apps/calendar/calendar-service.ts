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
 * Calendar Service
 *
 * Manages calendar events, dates, and scheduling.
 * Mock implementation for testing and development.
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date; // Event date
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location?: string;
  allDay: boolean;
  remindMinutes?: number; // Remind X minutes before
  color: string; // Hex color for event
}

export interface CalendarDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  weeks: CalendarDay[][];
}

export type ViewMode = 'month' | 'week' | 'day';

export interface ICalendarService {
  // Navigation
  getCurrentMonth(): CalendarMonth;
  getCurrentDate(): Date;
  nextMonth(): CalendarMonth;
  previousMonth(): CalendarMonth;
  goToDate(date: Date): CalendarMonth;

  // Event management
  addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent;
  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null;
  deleteEvent(id: string): boolean;
  getEvent(id: string): CalendarEvent | null;

  // Event queries
  getEventsForDate(date: Date): CalendarEvent[];
  getUpcomingEvents(days: number): CalendarEvent[]; // Next N days
  getEventsByMonth(year: number, month: number): CalendarEvent[];
  searchEvents(query: string): CalendarEvent[];

  // View mode
  setViewMode(mode: ViewMode): void;
  getViewMode(): ViewMode;

  // Today
  getToday(): Date;
  getTodayEvents(): CalendarEvent[];

  // Listeners
  onEventAdded(callback: (event: CalendarEvent) => void): () => void;
  onEventUpdated(callback: (event: CalendarEvent) => void): () => void;
  onEventDeleted(callback: (eventId: string) => void): () => void;
}

/**
 * Mock Calendar Service for testing
 */
export class MockCalendarService implements ICalendarService {
  private currentDate: Date;
  private events: Map<string, CalendarEvent> = new Map();
  private nextEventId = 1;
  private viewMode: ViewMode = 'month';
  private addedListeners: Array<(event: CalendarEvent) => void> = [];
  private updatedListeners: Array<(event: CalendarEvent) => void> = [];
  private deletedListeners: Array<(eventId: string) => void> = [];

  constructor() {
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);
    this.initializeSampleEvents();
  }

  private initializeSampleEvents(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's events
    this.addEvent({
      title: 'Team Standup',
      date: today,
      startTime: '09:00',
      endTime: '09:30',
      allDay: false,
      location: 'Conference Room A',
      color: '#FF6B6B',
    });

    this.addEvent({
      title: 'Lunch Break',
      date: today,
      startTime: '12:00',
      endTime: '13:00',
      allDay: false,
      color: '#4ECDC4',
    });

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.addEvent({
      title: 'Project Review',
      date: tomorrow,
      startTime: '14:00',
      endTime: '15:30',
      allDay: false,
      location: 'Virtual',
      color: '#95E1D3',
    });

    // This week
    const wednesday = new Date(today);
    wednesday.setDate(wednesday.getDate() + (3 - today.getDay()));

    this.addEvent({
      title: 'Client Meeting',
      date: wednesday,
      startTime: '10:00',
      endTime: '11:00',
      allDay: false,
      location: 'Video Call',
      remindMinutes: 15,
      color: '#F38181',
    });

    // All-day event
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.addEvent({
      title: 'Conference',
      date: nextWeek,
      allDay: true,
      color: '#AA96DA',
    });

    // Future event
    const future = new Date(today);
    future.setDate(future.getDate() + 14);

    this.addEvent({
      title: 'Vacation',
      date: future,
      allDay: true,
      color: '#FCBAD3',
      description: 'Week off',
    });
  }

  getCurrentDate(): Date {
    return new Date(this.currentDate);
  }

  getCurrentMonth(): CalendarMonth {
    return this.buildCalendarMonth(this.currentDate.getFullYear(), this.currentDate.getMonth());
  }

  nextMonth(): CalendarMonth {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    return this.getCurrentMonth();
  }

  previousMonth(): CalendarMonth {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    return this.getCurrentMonth();
  }

  goToDate(date: Date): CalendarMonth {
    this.currentDate = new Date(date);
    this.currentDate.setHours(0, 0, 0, 0);
    return this.getCurrentMonth();
  }

  addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const id = `event-${this.nextEventId++}`;
    const fullEvent: CalendarEvent = { ...event, id };
    this.events.set(id, fullEvent);
    this.notifyEventAdded(fullEvent);
    return fullEvent;
  }

  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const event = this.events.get(id);
    if (!event) return null;
    const updated = { ...event, ...updates, id };
    this.events.set(id, updated);
    this.notifyEventUpdated(updated);
    return updated;
  }

  deleteEvent(id: string): boolean {
    const result = this.events.delete(id);
    if (result) this.notifyEventDeleted(id);
    return result;
  }

  getEvent(id: string): CalendarEvent | null {
    return this.events.get(id) || null;
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    const dateStr = this.dateToString(date);
    return Array.from(this.events.values())
      .filter(e => this.dateToString(e.date) === dateStr)
      .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
  }

  getUpcomingEvents(days: number): CalendarEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    return Array.from(this.events.values())
      .filter(e => {
        const eDate = new Date(e.date);
        eDate.setHours(0, 0, 0, 0);
        return eDate >= today && eDate <= endDate;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  getEventsByMonth(year: number, month: number): CalendarEvent[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return Array.from(this.events.values())
      .filter(e => {
        const eDate = new Date(e.date);
        eDate.setHours(0, 0, 0, 0);
        return eDate >= firstDay && eDate <= lastDay;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  searchEvents(query: string): CalendarEvent[] {
    const lower = query.toLowerCase();
    return Array.from(this.events.values()).filter(
      e =>
        e.title.toLowerCase().includes(lower) ||
        e.description?.toLowerCase().includes(lower) ||
        e.location?.toLowerCase().includes(lower)
    );
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  getViewMode(): ViewMode {
    return this.viewMode;
  }

  getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  getTodayEvents(): CalendarEvent[] {
    return this.getEventsForDate(this.getToday());
  }

  onEventAdded(callback: (event: CalendarEvent) => void): () => void {
    this.addedListeners.push(callback);
    return () => {
      const idx = this.addedListeners.indexOf(callback);
      if (idx >= 0) this.addedListeners.splice(idx, 1);
    };
  }

  onEventUpdated(callback: (event: CalendarEvent) => void): () => void {
    this.updatedListeners.push(callback);
    return () => {
      const idx = this.updatedListeners.indexOf(callback);
      if (idx >= 0) this.updatedListeners.splice(idx, 1);
    };
  }

  onEventDeleted(callback: (eventId: string) => void): () => void {
    this.deletedListeners.push(callback);
    return () => {
      const idx = this.deletedListeners.indexOf(callback);
      if (idx >= 0) this.deletedListeners.splice(idx, 1);
    };
  }

  private buildCalendarMonth(year: number, month: number): CalendarMonth {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks: CalendarDay[][] = [];
    let currentDate = new Date(startDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= lastDay) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const dateForDay = new Date(currentDate);
        dateForDay.setHours(0, 0, 0, 0);

        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = this.dateToString(dateForDay) === this.dateToString(today);
        const events = this.getEventsForDate(currentDate);

        week.push({
          date: new Date(currentDate),
          events,
          isToday,
          isCurrentMonth,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }

    return { year, month, weeks };
  }

  private dateToString(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private notifyEventAdded(event: CalendarEvent): void {
    for (const listener of this.addedListeners) {
      listener(event);
    }
  }

  private notifyEventUpdated(event: CalendarEvent): void {
    for (const listener of this.updatedListeners) {
      listener(event);
    }
  }

  private notifyEventDeleted(eventId: string): void {
    for (const listener of this.deletedListeners) {
      listener(eventId);
    }
  }
}
