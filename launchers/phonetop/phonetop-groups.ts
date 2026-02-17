/**
 * PhoneTop Groups Module
 *
 * Handles folder/category grouping for PhoneTop launcher.
 * Apps are grouped into folders by their @tsyne-app:category metadata.
 */

import { AppMetadata } from 'tsyne';

// Grid position in the launcher
export interface GridPosition {
  page: number;
  row: number;
  col: number;
}

// App icon state
export interface GridIcon {
  metadata: AppMetadata;
  position: GridPosition;
  resourceName?: string;  // Registered icon resource name (for SVG icons)
  svgIcon?: string;       // Raw SVG string for CVG rendering
  /** Pre-loaded builder function for static apps (Android/iOS) */
  staticBuilder?: (...args: any[]) => void | Promise<void>;
}

// Folder containing apps grouped by category
export interface Folder {
  name: string;
  category: string;
  apps: GridIcon[];
  position: GridPosition;
}

// Grid item can be either an app icon or a folder
export type GridItem =
  | { type: 'app'; icon: GridIcon }
  | { type: 'folder'; folder: Folder };

// Category display names and folder icons (SVG for consistent sizing)
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
  'internet': {
    displayName: 'Internet',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24"/><ellipse cx="32" cy="32" rx="12" ry="24"/><path d="M8 32h48M10 20h44M10 44h44"/></svg>`
  },
  'communication': {
    displayName: 'Communication',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 16h48v28H28l-12 8v-8H8z" fill="#444"/><circle cx="24" cy="30" r="3" fill="#666"/><circle cx="36" cy="30" r="3" fill="#666"/></svg>`
  },
  'finance': {
    displayName: 'Finance',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24" fill="#444"/><path d="M32 16v32M24 24h12c4 0 4 8 0 8H24h14c4 0 4 8 0 8H24" stroke="#999"/></svg>`
  },
  'network': {
    displayName: 'Network',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="16" r="6" fill="#444"/><circle cx="16" cy="48" r="6" fill="#444"/><circle cx="48" cy="48" r="6" fill="#444"/><path d="M32 22v10M26 42l-4-10M38 42l4-10"/></svg>`
  },
  'reference': {
    displayName: 'Reference',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="8" width="40" height="48" rx="4" fill="#444"/><path d="M20 20h24M20 30h20M20 40h16" stroke="#999"/></svg>`
  },
  'native': {
    displayName: 'Native',
    icon: `<svg viewBox="0 0 64 64" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="#444"/><path d="M20 32h24M32 20v24" stroke="#999" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#81C784"/></svg>`
  },
};

