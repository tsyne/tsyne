/**
 * Desktop Environment Types and Configuration
 *
 * Types, interfaces, and constants used by the Tsyne Desktop Environment.
 */

import { AppMetadata } from './app-metadata';
import { ITsyneWindow } from './tsyne-window';

// Desktop configuration constants
export const ICON_SIZE = 80;
export const ICON_SPACING = 100;
export const ICON_POSITION_PREFIX = 'desktop.icon.';
export const DOCK_APPS_KEY = 'desktop.dock.apps';
export const WINDOW_MODE_KEY = 'desktop.windowMode';

/** Window mode for launched apps */
export type WindowMode = 'inner' | 'external';

/** Desktop initialization options */
export interface DesktopOptions {
  /** Directory to scan for apps with @tsyne-app metadata. Defaults to 'examples/' relative to cwd */
  appDirectory?: string;
  /** Pre-defined apps to use instead of scanning directories. For testing. */
  apps?: AppMetadata[];
  /** Port for remote debug server (disabled if not set) */
  debugPort?: number;
}

/** Desktop icon representing an app */
export interface DesktopIcon {
  metadata: AppMetadata;
  resourceName?: string;
  x: number;
  y: number;
  selected: boolean;
}

/** Folder containing apps grouped by category */
export interface DesktopFolder {
  name: string;
  category: string;
  apps: DesktopIcon[];
  resourceName?: string;
  x: number;
  y: number;
}

/** File icon for files on ~/Desktop/ */
export interface FileIcon {
  filePath: string;      // Full path to the file
  fileName: string;      // Display name (basename)
  resourceName?: string; // Icon resource (thumbnail or generic)
  x: number;
  y: number;
  selected: boolean;
}

/** Tracking info for an open app */
export interface OpenApp {
  metadata: AppMetadata;
  tsyneWindow: ITsyneWindow;
}

/** Category configuration for app groups */
export const CATEGORY_CONFIG: Record<string, { displayName: string; icon: string }> = {
  'utilities': {
    displayName: 'Utilities',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M40 12L52 24M48 16L24 40L20 52L32 48L56 24C58 22 58 18 56 16L48 8C46 6 42 6 40 8L40 12Z"/><path d="M8 56L20 44"/><circle cx="14" cy="50" r="4" fill="#666"/></svg>`
  },
  'graphics': {
    displayName: 'Graphics',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="20" cy="44" r="12" fill="#E57373"/><circle cx="32" cy="24" r="12" fill="#81C784"/><circle cx="44" cy="44" r="12" fill="#64B5F6"/></svg>`
  },
  'games': {
    displayName: 'Games',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="18" width="52" height="32" rx="8" fill="#444"/><circle cx="20" cy="34" r="6" fill="#666"/><path d="M20 28v12M14 34h12" stroke="#999" stroke-width="2"/><circle cx="44" cy="30" r="3" fill="#E57373"/><circle cx="50" cy="36" r="3" fill="#81C784"/><circle cx="44" cy="42" r="3" fill="#64B5F6"/><circle cx="38" cy="36" r="3" fill="#FFD54F"/></svg>`
  },
  'media': {
    displayName: 'Media',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24" fill="#444"/><circle cx="32" cy="32" r="8" fill="#666"/><circle cx="32" cy="32" r="2" fill="#999"/><path d="M32 8v4M32 52v4M8 32h4M52 32h4"/></svg>`
  },
  'phone': {
    displayName: 'Phone',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="4" width="32" height="56" rx="4" fill="#444"/><line x1="26" y1="10" x2="38" y2="10" stroke="#666"/><circle cx="32" cy="52" r="3" fill="#666"/></svg>`
  },
  'system': {
    displayName: 'System',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3"><circle cx="32" cy="32" r="10"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6M14 14l4 4M46 46l4 4M14 50l4-4M46 18l4-4"/></svg>`
  },
  'fun': {
    displayName: 'Fun',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="36" r="22" fill="#FFD54F"/><circle cx="24" cy="32" r="3" fill="#444"/><circle cx="40" cy="32" r="3" fill="#444"/><path d="M22 44c4 6 16 6 20 0" stroke="#444" stroke-width="3"/></svg>`
  },
  'productivity': {
    displayName: 'Productivity',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M16 20h32M16 32h24M16 44h28" stroke="#999"/><path d="M48 24l-8 8-4-4" stroke="#81C784" stroke-width="3"/></svg>`
  },
  'creativity': {
    displayName: 'Creativity',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><path d="M32 8l6 18h18l-14 10 6 18-16-12-16 12 6-18-14-10h18z" fill="#FFD54F" stroke="#F9A825"/></svg>`
  },
  'development': {
    displayName: 'Development',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l-12 12 12 12M44 20l12 12-12 12M38 12l-12 40"/></svg>`
  },
  'native': {
    displayName: 'Native',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M20 32h24M32 20v24" stroke="#999" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#81C784"/></svg>`
  },
};

/** Apps that support opening files via drag-and-drop */
export const FILE_DROP_APPS = new Set([
  'Image Viewer',
  'Pixel Editor',
]);

/** Emoji mapping for app icons when no custom icon is available */
export const ICON_EMOJI_MAP: Record<string, string> = {
  'calculator': '\u{1F5A9}',   // Calculator
  'counter': '\u{1F522}',       // Numbers
  'todo': '\u{2611}',           // Checkbox
  'clock': '\u{1F550}',         // Clock
  'stopwatch': '\u{23F1}',      // Stopwatch
  'timer': '\u{23F2}',          // Timer
  'calendar': '\u{1F4C5}',      // Calendar
  'notes': '\u{1F4DD}',         // Memo
  'settings': '\u{2699}',       // Gear
  'file': '\u{1F4C1}',          // Folder
  'password': '\u{1F511}',      // Key
  'dice': '\u{1F3B2}',          // Die
  'game': '\u{1F3AE}',          // Game controller
  'rock': '\u{270A}',           // Fist (rock paper scissors)
  'quiz': '\u{2753}',           // Question mark
  'color': '\u{1F3A8}',         // Palette
  'tip': '\u{1F4B5}',           // Money
  'bmi': '\u{2696}',            // Scale
  'form': '\u{1F4CB}',          // Clipboard
  'list': '\u{1F4DD}',          // List
  'shop': '\u{1F6D2}',          // Shopping cart
  'table': '\u{1F4CA}',         // Bar chart
  'player': '\u{1F3C3}',        // Runner
  'hello': '\u{1F44B}',         // Wave
};

/** Default emoji for apps without a matching icon */
export const DEFAULT_ICON_EMOJI = '\u{1F4BB}';  // Laptop
