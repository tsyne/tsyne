/**
 * Shared utility for resolving app paths.
 */

export function tryResolve(path: string): string | null {
  try { return require.resolve(path); } catch { return null; }
}
