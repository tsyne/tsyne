import { SourceLocation } from './metadata';

/**
 * Parse a stack trace to extract source location
 * This captures where in the user's code a widget was created
 */
export class StackTraceParser {
  /**
   * Parse stack trace and extract the user's code location
   * @param stack Stack trace string from Error().stack
   * @param skipFrames Number of frames to skip (default 2: Error + designer method)
   * @returns Source location or null if cannot be parsed
   */
  static parseStackTrace(stack: string, skipFrames: number = 2): SourceLocation | null {
    const lines = stack.split('\n');

    // Skip the first line (Error message) and designer frames
    for (let i = skipFrames; i < lines.length; i++) {
      const line = lines[i];
      const location = this.parseStackLine(line);

      if (location && !this.isInternalFile(location.file)) {
        return location;
      }
    }

    return null;
  }

  /**
   * Parse a single stack trace line
   * Supports multiple formats:
   * - at Object.<anonymous> (/path/to/file.ts:123:45)
   * - at /path/to/file.ts:123:45
   * - /path/to/file.ts:123:45
   */
  private static parseStackLine(line: string): SourceLocation | null {
    // Try common Node.js stack trace format: at ... (/path/to/file.ts:123:45)
    let match = line.match(/\((.+):(\d+):(\d+)\)/);

    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10)
      };
    }

    // Try simpler format: at /path/to/file.ts:123:45
    match = line.match(/at\s+(.+):(\d+):(\d+)/);

    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10)
      };
    }

    // Try bare format: /path/to/file.ts:123:45
    match = line.match(/(.+):(\d+):(\d+)/);

    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10)
      };
    }

    return null;
  }

  /**
   * Check if a file is internal (tsyne or tsyne-designer)
   * We want to skip these and find the user's code
   */
  private static isInternalFile(file: string): boolean {
    return file.includes('tsyne-designer') ||
           file.includes('node_modules') ||
           (file.includes('tsyne') && !file.includes('examples'));
  }

  /**
   * Get a clean relative path for display
   */
  static getRelativePath(file: string, baseDir?: string): string {
    if (baseDir && file.startsWith(baseDir)) {
      return file.substring(baseDir.length + 1);
    }

    // Just get the filename for now
    const parts = file.split('/');
    return parts[parts.length - 1];
  }
}
