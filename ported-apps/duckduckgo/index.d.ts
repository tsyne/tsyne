/**
 * DuckDuckGo Privacy Browser - Tsyne Port
 *
 * @tsyne-app:name DuckDuckGo
 * @tsyne-app:icon search
 * @tsyne-app:category Internet
 * @tsyne-app:args (a: App) => void
 *
 * A privacy-focused search browser ported from DuckDuckGo iOS to Tsyne:
 * - Private search with no tracking
 * - Real-time privacy dashboard showing blocked trackers
 * - Search history with filtering
 * - Bookmarks and favorites management
 * - Privacy settings and configuration
 * - Quick actions (bangs) for specialized searches
 * - HTTPS encryption status
 *
 * Portions copyright Duck Duck Go Inc and portions copyright Paul Hammant 2025
 */
export interface SearchResult {
    id: string;
    query: string;
    timestamp: Date;
    domain: string;
    title: string;
    url: string;
    favicon: string;
}
export interface Bookmark {
    id: string;
    title: string;
    url: string;
    favicon: string;
    category: string;
    timestamp: Date;
    isPrivate: boolean;
}
export interface TrackerBlock {
    id: string;
    domain: string;
    trackersBlocked: number;
    timestamp: Date;
    httpsUpgraded: boolean;
    cookiesManaged: number;
}
export interface PrivacyStats {
    totalTrackersBlocked: number;
    totalSitesVisited: number;
    httpsUpgrades: number;
    cookiePops: number;
    averageTrackersPerSite: number;
}
export interface BangAction {
    name: string;
    symbol: string;
    description: string;
    example: string;
}
export interface AppSettings {
    theme: 'light' | 'dark';
    autoHttpsUpgrade: boolean;
    blockTrackers: boolean;
    blockAds: boolean;
    autoclearData: boolean;
    autoclearInterval: 'daily' | 'weekly' | 'monthly';
    safeSearch: boolean;
    resultsPerPage: number;
}
type ChangeListener = () => void;
export declare class DuckDuckGoStore {
    private searchHistory;
    private bookmarks;
    private trackerBlocks;
    private settings;
    private bangs;
    private nextSearchId;
    private nextBookmarkId;
    private changeListeners;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
    getSearchHistory(): SearchResult[];
    search(query: string): SearchResult;
    deleteSearchHistory(searchId: string): boolean;
    clearAllHistory(): void;
    filterSearchHistory(query: string): SearchResult[];
    getRecentSearches(limit?: number): SearchResult[];
    getBookmarks(): Bookmark[];
    getBookmarksByCategory(category: string): Bookmark[];
    addBookmark(title: string, url: string, category: string, isPrivate?: boolean): Bookmark;
    deleteBookmark(bookmarkId: string): boolean;
    updateBookmark(bookmarkId: string, title: string, category: string): boolean;
    getCategories(): string[];
    getFavorites(): Bookmark[];
    getTrackerBlocks(): TrackerBlock[];
    getPrivacyStats(): PrivacyStats;
    addTrackerBlock(domain: string, trackersBlocked: number, httpsUpgraded?: boolean): void;
    getTopBlockedDomains(limit?: number): TrackerBlock[];
    getSettings(): AppSettings;
    updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void;
    toggleTheme(): void;
    toggleTracker(): void;
    toggleAds(): void;
    getBangs(): BangAction[];
    searchBangs(query: string): BangAction[];
    getTotalSearches(): number;
    getTodaySearches(): number;
    getAverageSearchesPerDay(): number;
    getMostSearchedQueries(limit?: number): string[];
    getPrivacyScore(): number;
}
export declare function buildDuckDuckGoApp(a: any): void;
export {};
