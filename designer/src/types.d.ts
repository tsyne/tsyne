// Type declarations for modules without types

declare module 'diff' {
  export interface Change {
    count?: number;
    value: string;
    added?: boolean;
    removed?: boolean;
  }

  export function diffLines(oldStr: string, newStr: string): Change[];
  export function diffChars(oldStr: string, newStr: string): Change[];
  export function diffWords(oldStr: string, newStr: string): Change[];
  export function createPatch(fileName: string, oldStr: string, newStr: string, oldHeader?: string, newHeader?: string): string;
  export function applyPatch(source: string, patch: string): string | false;
}
