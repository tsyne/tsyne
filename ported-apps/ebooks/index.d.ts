/**
 * Ebook Reader - Tsyne Port of FlutterEbookApp
 *
 * A simple ebook library manager with reading tracking, favorites,
 * and customizable reading preferences. Demonstrates Observable MVC pattern.
 *
 * @tsyne-app {"name": "Ebook Reader", "version": "1.0.0"}
 */
interface Ebook {
    id: string;
    title: string;
    author: string;
    description: string;
    coverEmoji: string;
    downloadProgress: number;
    isDownloaded: boolean;
    isFavorite: boolean;
    lastReadPosition: number;
    fileSize: number;
    format: 'EPUB' | 'PDF' | 'MOBI';
    publicationDate: string;
    totalPages: number;
    currentPage: number;
}
interface Bookmark {
    id: string;
    ebookId: string;
    pageNumber: number;
    note: string;
    createdAt: Date;
}
interface ReadingStats {
    ebookId: string;
    totalReadTime: number;
    lastReadDate: Date;
    sessionCount: number;
}
interface ReadingPreferences {
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    fontFamily: 'serif' | 'sans-serif';
    lineSpacing: 'normal' | 'relaxed' | 'loose';
}
type ChangeListener = () => void;
declare class EbookStore {
    private books;
    private bookmarks;
    private readingStats;
    private preferences;
    private currentlyReading;
    private changeListeners;
    private nextBookId;
    private nextBookmarkId;
    constructor();
    private initializeBooks;
    getBooks(): Ebook[];
    getBookCount(): number;
    getBookById(id: string): Ebook | undefined;
    searchBooks(query: string): Ebook[];
    addBook(book: Omit<Ebook, 'id'>): Ebook;
    deleteBook(id: string): boolean;
    getDownloadedBooks(): Ebook[];
    getDownloadedCount(): number;
    getFavorites(): Ebook[];
    getFavoriteCount(): number;
    toggleFavorite(id: string): boolean;
    startDownload(id: string): boolean;
    private simulateDownload;
    cancelDownload(id: string): boolean;
    getCurrentlyReading(): string | null;
    setCurrentlyReading(id: string | null): boolean;
    updateReadingProgress(id: string, page: number, percentage: number): boolean;
    getReadingStats(id: string): ReadingStats | undefined;
    getTotalReadTime(id: string): number;
    getBookmarks(ebookId: string): Bookmark[];
    getBookmarkCount(): number;
    addBookmark(ebookId: string, pageNumber: number, note: string): Bookmark;
    deleteBookmark(id: string): boolean;
    getPreferences(): ReadingPreferences;
    setTheme(theme: 'light' | 'dark'): void;
    setFontSize(size: 'small' | 'medium' | 'large'): void;
    setFontFamily(family: 'serif' | 'sans-serif'): void;
    setLineSpacing(spacing: 'normal' | 'relaxed' | 'loose'): void;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
}
export declare function buildEbookApp(app: any): Promise<any>;
export { EbookStore, Ebook, Bookmark, ReadingStats, ReadingPreferences };
