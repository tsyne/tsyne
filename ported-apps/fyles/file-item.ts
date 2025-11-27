/**
 * File Item Data Model
 *
 * Represents a file or directory in the file browser.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getFancyFolderIcon, getFolderMetadata, SpecialFolderType } from './folder-metadata';

export interface FileItem {
  name: string;         // Display name (without extension for files)
  fullName: string;     // Full name with extension
  path: string;         // Absolute path
  isDirectory: boolean;
  isHidden: boolean;
  extension?: string;
  size?: number;
  modified?: Date;
  /** Special folder type (for fancy folder backgrounds) */
  specialFolderType?: SpecialFolderType;
  /** Background image path (for fancy folder backgrounds) */
  backgroundImagePath?: string;
}

/**
 * Create FileItem from fs.Dirent
 */
export function createFileItem(dirent: fs.Dirent, dirPath: string): FileItem {
  const fullName = dirent.name;
  const fullPath = path.join(dirPath, fullName);
  const isHidden = fullName.startsWith('.');

  let stats: fs.Stats | null = null;
  try {
    stats = fs.statSync(fullPath);
  } catch (err) {
    // Ignore stat errors (permissions, etc.)
  }

  const isDirectory = dirent.isDirectory();
  const extension = isDirectory ? undefined : path.extname(fullName).slice(1);

  // Remove extension from display name for files
  let displayName = fullName;
  if (!isDirectory && extension) {
    displayName = path.basename(fullName, '.' + extension);
  }

  // Get folder metadata for directories (fancy folder backgrounds)
  let specialFolderType: SpecialFolderType | undefined;
  let backgroundImagePath: string | undefined;
  if (isDirectory) {
    const metadata = getFolderMetadata(fullPath);
    if (metadata.specialType !== SpecialFolderType.None) {
      specialFolderType = metadata.specialType;
    }
    if (metadata.backgroundImagePath) {
      backgroundImagePath = metadata.backgroundImagePath;
    }
  }

  return {
    name: displayName,
    fullName: fullName,
    path: fullPath,
    isDirectory: isDirectory,
    isHidden: isHidden,
    extension: extension,
    size: stats?.size,
    modified: stats?.mtime,
    specialFolderType,
    backgroundImagePath,
  };
}

/**
 * Get icon resource name or emoji based on file type
 * Uses fancy folder icons for special folders and folders with backgrounds
 */
export function getFileIcon(item: FileItem): string {
  if (item.isDirectory) {
    // Use fancy folder icon based on metadata
    return getFancyFolderIcon(item.path);
  }

  // Map common file extensions to emojis
  const ext = item.extension?.toLowerCase();

  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
    return '🖼️';
  }

  // Documents
  if (['pdf', 'doc', 'docx', 'odt'].includes(ext || '')) {
    return '📄';
  }

  // Text files
  if (['txt', 'md', 'rst'].includes(ext || '')) {
    return '📝';
  }

  // Code files
  if (['ts', 'js', 'py', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'rs', 'rb', 'php'].includes(ext || '')) {
    return '💻';
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
    return '🎵';
  }

  // Video
  if (['mp4', 'avi', 'mkv', 'mov', 'webm'].includes(ext || '')) {
    return '🎬';
  }

  // Archives
  if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext || '')) {
    return '📦';
  }

  // Default file icon
  return '📃';
}
