/**
 * Shared utilities for clock-related apps (clock, timer, stopwatch, alarms)
 */

import { styles, FontStyle } from 'tsyne';
import type { CanvasLine } from 'tsyne';

// Define shared clock styles
styles({
  'clock-display': {
    text_align: 'center',
    font_style: FontStyle.BOLD,
    font_size: 48,
  },
  'clock-date': {
    text_align: 'center',
    font_size: 18,
  },
});

// Analog clock constants
export const CLOCK_SIZE = 200;
export const CLOCK_CENTER = CLOCK_SIZE / 2;
export const CLOCK_RADIUS = 90;

// Stopwatch dial constants (smaller dial)
export const STOPWATCH_SIZE = 180;
export const STOPWATCH_CENTER = STOPWATCH_SIZE / 2;
export const STOPWATCH_RADIUS = 80;

/** Calculate hour marker line coordinates */
export function calcHourMarkerLine(hourIndex: number): { x1: number; y1: number; x2: number; y2: number } {
  const angle = (hourIndex / 12) * 2 * Math.PI - Math.PI / 2;
  const innerRadius = CLOCK_RADIUS * 0.85;
  const outerRadius = CLOCK_RADIUS * 0.95;
  return {
    x1: CLOCK_CENTER + Math.cos(angle) * innerRadius,
    y1: CLOCK_CENTER + Math.sin(angle) * innerRadius,
    x2: CLOCK_CENTER + Math.cos(angle) * outerRadius,
    y2: CLOCK_CENTER + Math.sin(angle) * outerRadius,
  };
}

/** Calculate clock hand line from rotation (0-1 = full rotation, 0 = 12 o'clock) */
export function calcHandLine(rotation: number, length: number): { x1: number; y1: number; x2: number; y2: number } {
  const angle = rotation * 2 * Math.PI - Math.PI / 2;
  return {
    x1: CLOCK_CENTER,
    y1: CLOCK_CENTER,
    x2: CLOCK_CENTER + Math.cos(angle) * length,
    y2: CLOCK_CENTER + Math.sin(angle) * length,
  };
}

/** Calculate stopwatch hand line (same formula but for stopwatch dial) */
export function calcStopwatchHandLine(rotation: number, length: number): { x1: number; y1: number; x2: number; y2: number } {
  const angle = rotation * 2 * Math.PI - Math.PI / 2;
  return {
    x1: STOPWATCH_CENTER,
    y1: STOPWATCH_CENTER,
    x2: STOPWATCH_CENTER + Math.cos(angle) * length,
    y2: STOPWATCH_CENTER + Math.sin(angle) * length,
  };
}

/** Calculate stopwatch second marker line coordinates (60 markers) */
export function calcSecondMarkerLine(secondIndex: number): { x1: number; y1: number; x2: number; y2: number } {
  const angle = (secondIndex / 60) * 2 * Math.PI - Math.PI / 2;
  // Every 5th marker is longer (for 5, 10, 15... seconds)
  const innerRadius = secondIndex % 5 === 0 ? STOPWATCH_RADIUS * 0.80 : STOPWATCH_RADIUS * 0.88;
  const outerRadius = STOPWATCH_RADIUS * 0.95;
  return {
    x1: STOPWATCH_CENTER + Math.cos(angle) * innerRadius,
    y1: STOPWATCH_CENTER + Math.sin(angle) * innerRadius,
    x2: STOPWATCH_CENTER + Math.cos(angle) * outerRadius,
    y2: STOPWATCH_CENTER + Math.sin(angle) * outerRadius,
  };
}

/** Hand binding configuration */
export interface HandBinding {
  line: CanvasLine;
  length: number;
  rotation: () => number;
}

/** Format timer time as HH:MM:SS */
export function formatTimerTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/** Format stopwatch time as MM:SS.cc */
export function formatStopwatchTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}
