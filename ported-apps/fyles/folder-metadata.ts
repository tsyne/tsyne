/**
 * Folder Metadata (fancyfs style)
 *
 * Detects special folder types and background images.
 * Ported from: https://github.com/FyshOS/fancyfs
 *
 * Features:
 * - Special folder detection (Home, Desktop, Documents, Downloads, Music, Pictures, Videos)
 * - Background image detection (.background.png, .background.jpg, .background.jpeg, .background.svg)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Special folder types with unique icons
 */
export enum SpecialFolderType {
  None = 'none',
  Home = 'home',
  Desktop = 'desktop',
  Documents = 'documents',
  Downloads = 'downloads',
  Music = 'music',
  Pictures = 'pictures',
  Videos = 'videos',
}

/**
 * Metadata for a folder (background and special type)
 */
export interface FolderMetadata {
  /** Special folder type (if any) */
  specialType: SpecialFolderType;
  /** Path to background image file (if found) */
  backgroundImagePath: string | null;
  /** Background image type */
  backgroundImageType: 'png' | 'jpg' | 'svg' | null;
}

/**
 * Supported background image filenames (in priority order)
 */
const BACKGROUND_FILES = [
  '.background.png',
  '.background.jpg',
  '.background.jpeg',
  '.background.svg',
];

/**
 * Get metadata for a folder
 *
 * Checks for:
 * 1. Special folder type (Home, Desktop, Documents, etc.)
 * 2. Background image files (.background.png, .background.jpg, etc.)
 */
export function getFolderMetadata(folderPath: string): FolderMetadata {
  const homeDir = os.homedir();
  let specialType = SpecialFolderType.None;

  // Check for special folder types
  if (folderPath === homeDir) {
    specialType = SpecialFolderType.Home;
  } else if (isDirectChildOf(folderPath, homeDir)) {
    const folderName = path.basename(folderPath);
    switch (folderName) {
      case 'Desktop':
        specialType = SpecialFolderType.Desktop;
        break;
      case 'Documents':
        specialType = SpecialFolderType.Documents;
        break;
      case 'Downloads':
        specialType = SpecialFolderType.Downloads;
        break;
      case 'Music':
        specialType = SpecialFolderType.Music;
        break;
      case 'Pictures':
        specialType = SpecialFolderType.Pictures;
        break;
      case 'Videos':
      case 'Movies':
        specialType = SpecialFolderType.Videos;
        break;
    }
  }

  // Check for background image
  const { backgroundImagePath, backgroundImageType } = findBackgroundImage(folderPath);

  return {
    specialType,
    backgroundImagePath,
    backgroundImageType,
  };
}

/**
 * Find a background image in the folder
 */
function findBackgroundImage(folderPath: string): {
  backgroundImagePath: string | null;
  backgroundImageType: 'png' | 'jpg' | 'svg' | null;
} {
  for (const bgFile of BACKGROUND_FILES) {
    const bgPath = path.join(folderPath, bgFile);
    try {
      if (fs.existsSync(bgPath)) {
        const ext = path.extname(bgFile).toLowerCase();
        let imageType: 'png' | 'jpg' | 'svg' | null = null;
        if (ext === '.png') imageType = 'png';
        else if (ext === '.jpg' || ext === '.jpeg') imageType = 'jpg';
        else if (ext === '.svg') imageType = 'svg';

        return {
          backgroundImagePath: bgPath,
          backgroundImageType: imageType,
        };
      }
    } catch {
      // Ignore errors (permissions, etc.)
    }
  }

  return {
    backgroundImagePath: null,
    backgroundImageType: null,
  };
}

/**
 * Check if a path is a direct child of a parent directory
 */
function isDirectChildOf(childPath: string, parentPath: string): boolean {
  const parentOfChild = path.dirname(childPath);
  return parentOfChild === parentPath;
}

/**
 * Check if a folder has metadata (special type or background image)
 */
export function hasFolderMetadata(folderPath: string): boolean {
  const metadata = getFolderMetadata(folderPath);
  return metadata.specialType !== SpecialFolderType.None || metadata.backgroundImagePath !== null;
}

/**
 * Get the icon emoji for a special folder type
 */
export function getSpecialFolderIcon(specialType: SpecialFolderType): string {
  switch (specialType) {
    case SpecialFolderType.Home:
      return '🏠';
    case SpecialFolderType.Desktop:
      return '🖥️';
    case SpecialFolderType.Documents:
      return '📑';
    case SpecialFolderType.Downloads:
      return '⬇️';
    case SpecialFolderType.Music:
      return '🎵';
    case SpecialFolderType.Pictures:
      return '🖼️';
    case SpecialFolderType.Videos:
      return '🎬';
    default:
      return '📁'; // Regular folder
  }
}

/**
 * Get an enhanced folder icon that shows special folder type or background indicator
 *
 * Returns a string like:
 * - "🏠" for Home
 * - "📑" for Documents
 * - "📁🎨" for folder with background image
 * - "📁" for regular folder
 */
export function getFancyFolderIcon(folderPath: string): string {
  const metadata = getFolderMetadata(folderPath);

  // Special folder type takes precedence
  if (metadata.specialType !== SpecialFolderType.None) {
    return getSpecialFolderIcon(metadata.specialType);
  }

  // Folder with background image
  if (metadata.backgroundImagePath) {
    return '📁🎨'; // Folder with art/background indicator
  }

  // Regular folder
  return '📁';
}

/**
 * Get descriptive text for folder metadata (for tooltips or status)
 */
export function getFolderMetadataDescription(folderPath: string): string | null {
  const metadata = getFolderMetadata(folderPath);
  const parts: string[] = [];

  if (metadata.specialType !== SpecialFolderType.None) {
    parts.push(`Special: ${metadata.specialType}`);
  }

  if (metadata.backgroundImagePath) {
    parts.push(`Background: ${path.basename(metadata.backgroundImagePath)}`);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}
