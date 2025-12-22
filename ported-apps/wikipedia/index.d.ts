/**
 * Wikipedia - Tsyne Port
 *
 * @tsyne-app:name Wikipedia
 * @tsyne-app:icon book
 * @tsyne-app:category Reference
 * @tsyne-app:args (a: App) => void
 *
 * The free encyclopedia reader and discovery tool ported from Wikipedia iOS to Tsyne:
 * - Full-text search across millions of articles
 * - Multi-language support (300+ languages)
 * - Reading history tracking
 * - Saved articles and reading lists
 * - Featured content discovery
 * - Article tabs and organization
 * - Offline article storage
 *
 * Portions copyright (c) 2013–2025 Wikimedia Foundation and portions copyright Paul Hammant 2025
 */
export interface Article {
    id: string;
    title: string;
    extract: string;
    imageUrl: string;
    language: string;
    url: string;
    pageId: number;
    timestamp: Date;
    views: number;
    isStub: boolean;
}
export interface ReadingListItem {
    id: string;
    articleTitle: string;
    articleId: number;
    language: string;
    summary: string;
    timestamp: Date;
    imageUrl: string;
}
export interface ReadingHistory {
    id: string;
    articleTitle: string;
    articleId: number;
    language: string;
    viewedAt: Date;
    timeSpent: number;
    scrollPosition: number;
}
export interface FeaturedContent {
    id: string;
    title: string;
    type: 'featured-article' | 'picture-of-day' | 'in-the-news' | 'on-this-day';
    description: string;
    imageUrl: string;
    language: string;
    date: Date;
}
export interface SearchSuggestion {
    id: string;
    title: string;
    pageId: number;
    views: number;
}
export interface LanguageOption {
    code: string;
    name: string;
    localName: string;
    articles: number;
}
type ChangeListener = () => void;
export declare class WikipediaStore {
    private searchHistory;
    private readingList;
    private readingHistory;
    private featuredContent;
    private languages;
    private currentLanguage;
    private nextArticleId;
    private nextSavedId;
    private nextHistoryId;
    private changeListeners;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
    search(query: string): SearchSuggestion[];
    viewArticle(suggestion: SearchSuggestion): Article;
    getSearchHistory(): Article[];
    clearSearchHistory(): void;
    deleteFromSearchHistory(articleId: string): boolean;
    getReadingList(): ReadingListItem[];
    saveArticle(article: Article): ReadingListItem;
    removeSavedArticle(itemId: string): boolean;
    isSavedArticle(articleId: number): boolean;
    getReadingListByLanguage(language: string): ReadingListItem[];
    getReadingHistory(): ReadingHistory[];
    private addToReadingHistory;
    clearReadingHistory(): void;
    deleteFromReadingHistory(historyId: string): boolean;
    getReadingStats(): {
        totalArticles: number;
        totalTimeSpent: number;
        averageTimePerArticle: number;
    };
    getFeaturedContent(): FeaturedContent[];
    getFeaturedContentByType(type: FeaturedContent['type']): FeaturedContent[];
    getLanguages(): LanguageOption[];
    getCurrentLanguage(): LanguageOption;
    setCurrentLanguage(languageCode: string): boolean;
    getTopReadArticles(limit?: number): Article[];
    getTotalArticlesViewed(): number;
    getArticleCount(language?: string): number;
    getDaysActive(): number;
    getContributionScore(): number;
}
export declare function buildWikipediaApp(a: any): void;
export {};
