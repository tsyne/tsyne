/**
 * SearchModel - Observable search state for PhoneTop
 *
 * Single source of truth for search query. Views subscribe to changes
 * and update themselves when the query changes.
 */

/**
 * Callback signature for search query changes
 */
export type SearchChangeListener = (query: string) => void;

/**
 * Observable search model.
 * Views subscribe via onChange() and receive notifications when the query changes.
 */
export class SearchModel {
  private query: string = '';
  private listeners: Set<SearchChangeListener> = new Set();

  /**
   * Get the current search query.
   */
  getQuery(): string {
    return this.query;
  }

  /**
   * Set the search query and notify all listeners.
   */
  setQuery(query: string): void {
    const normalized = query.toLowerCase().trim();
    if (normalized === this.query) return;

    this.query = normalized;
    this.notifyListeners();
  }

  /**
   * Clear the search query.
   */
  clear(): void {
    this.setQuery('');
  }

  /**
   * Subscribe to query changes.
   * Returns an unsubscribe function.
   */
  onChange(listener: SearchChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.query);
      } catch (err) {
        console.error('[SearchModel] Listener error:', err);
      }
    }
  }
}
