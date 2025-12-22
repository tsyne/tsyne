/**
 * NextCloud Desktop Client - Tsyne Port
 *
 * @tsyne-app:name NextCloud
 * @tsyne-app:icon confirm
 * @tsyne-app:category Network
 * @tsyne-app:args (a: App) => void
 *
 * A cloud storage and file sync client ported from NextCloud iOS to Tsyne:
 * - File browser with folder navigation
 * - Upload and download management
 * - Account connection and authentication
 * - File sharing capabilities
 * - Sync status tracking
 * - Recent files and folders
 *
 * Portions copyright NextCloud Inc and portions copyright Paul Hammant 2025
 */
export interface CloudFile {
    id: string;
    name: string;
    path: string;
    isFolder: boolean;
    size: number;
    modified: Date;
    shared: boolean;
    owner: string;
}
export interface Account {
    id: string;
    username: string;
    server: string;
    email: string;
    isConnected: boolean;
    lastSync: Date;
    syncEnabled: boolean;
}
export interface SyncItem {
    id: string;
    fileName: string;
    action: 'upload' | 'download' | 'sync';
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    progress: number;
}
type ChangeListener = () => void;
export declare class NextCloudStore {
    private account;
    private files;
    private syncItems;
    private nextSyncId;
    private changeListeners;
    private currentPath;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
    getAccount(): Account;
    connectAccount(server: string, username: string, password: string): boolean;
    disconnectAccount(): void;
    toggleSync(enabled: boolean): void;
    getFiles(path?: string): CloudFile[];
    getAllFiles(): CloudFile[];
    getRecentFiles(limit?: number): CloudFile[];
    getSharedFiles(): CloudFile[];
    searchFiles(query: string): CloudFile[];
    deleteFile(fileId: string): void;
    shareFile(fileId: string): boolean;
    createFolder(path: string, folderName: string): CloudFile;
    getSyncItems(): SyncItem[];
    getActiveSyncItems(): SyncItem[];
    addSyncItem(fileName: string, action: 'upload' | 'download' | 'sync'): SyncItem;
    updateSyncProgress(syncId: string, progress: number): void;
    getTotalFileCount(): number;
    getTotalFolderCount(): number;
    getTotalStorageUsed(): number;
    getStoragePercentage(): number;
    formatBytes(bytes: number): string;
}
export declare function buildNextCloudApp(a: any): void;
export default buildNextCloudApp;
