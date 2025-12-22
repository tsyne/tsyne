"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextCloudStore = void 0;
exports.buildNextCloudApp = buildNextCloudApp;
class NextCloudStore {
    constructor() {
        this.account = {
            id: 'acc-001',
            username: 'john.doe',
            server: 'https://cloud.example.com',
            email: 'john@example.com',
            isConnected: true,
            lastSync: new Date(Date.now() - 300000),
            syncEnabled: true,
        };
        this.files = [
            {
                id: 'file-001',
                name: 'Documents',
                path: '/',
                isFolder: true,
                size: 0,
                modified: new Date(Date.now() - 604800000),
                shared: false,
                owner: 'john.doe',
            },
            {
                id: 'file-002',
                name: 'Photos',
                path: '/',
                isFolder: true,
                size: 0,
                modified: new Date(Date.now() - 86400000),
                shared: false,
                owner: 'john.doe',
            },
            {
                id: 'file-003',
                name: 'Project Report.pdf',
                path: '/Documents',
                isFolder: false,
                size: 2048000,
                modified: new Date(Date.now() - 172800000),
                shared: true,
                owner: 'john.doe',
            },
            {
                id: 'file-004',
                name: 'Budget 2025.xlsx',
                path: '/Documents',
                isFolder: false,
                size: 512000,
                modified: new Date(Date.now() - 345600000),
                shared: false,
                owner: 'john.doe',
            },
            {
                id: 'file-005',
                name: 'Vacation 2024.jpg',
                path: '/Photos',
                isFolder: false,
                size: 4096000,
                modified: new Date(Date.now() - 432000000),
                shared: true,
                owner: 'john.doe',
            },
        ];
        this.syncItems = [
            {
                id: 'sync-001',
                fileName: 'Presentation.pptx',
                action: 'upload',
                status: 'completed',
                progress: 100,
            },
            {
                id: 'sync-002',
                fileName: 'Archive.zip',
                action: 'download',
                status: 'in-progress',
                progress: 65,
            },
        ];
        this.nextSyncId = 3;
        this.changeListeners = [];
        this.currentPath = '/';
    }
    subscribe(listener) {
        this.changeListeners.push(listener);
        return () => {
            this.changeListeners = this.changeListeners.filter((l) => l !== listener);
        };
    }
    notifyChange() {
        this.changeListeners.forEach((listener) => listener());
    }
    // ========== Account ==========
    getAccount() {
        return { ...this.account };
    }
    connectAccount(server, username, password) {
        // Simulate connection
        this.account.isConnected = true;
        this.account.server = server;
        this.account.username = username;
        this.account.lastSync = new Date();
        this.notifyChange();
        return true;
    }
    disconnectAccount() {
        this.account.isConnected = false;
        this.notifyChange();
    }
    toggleSync(enabled) {
        this.account.syncEnabled = enabled;
        this.notifyChange();
    }
    // ========== Files ==========
    getFiles(path = '/') {
        return this.files.filter((f) => f.path === path).sort((a, b) => {
            if (a.isFolder !== b.isFolder)
                return b.isFolder ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
    }
    getAllFiles() {
        return [...this.files];
    }
    getRecentFiles(limit = 10) {
        return [...this.files]
            .filter((f) => !f.isFolder)
            .sort((a, b) => b.modified.getTime() - a.modified.getTime())
            .slice(0, limit);
    }
    getSharedFiles() {
        return this.files.filter((f) => f.shared && !f.isFolder);
    }
    searchFiles(query) {
        const lowerQuery = query.toLowerCase();
        return this.files.filter((f) => f.name.toLowerCase().includes(lowerQuery));
    }
    deleteFile(fileId) {
        this.files = this.files.filter((f) => f.id !== fileId);
        this.notifyChange();
    }
    shareFile(fileId) {
        const file = this.files.find((f) => f.id === fileId);
        if (file) {
            file.shared = !file.shared;
            this.notifyChange();
            return true;
        }
        return false;
    }
    createFolder(path, folderName) {
        const newFolder = {
            id: `folder-${Date.now()}`,
            name: folderName,
            path,
            isFolder: true,
            size: 0,
            modified: new Date(),
            shared: false,
            owner: this.account.username,
        };
        this.files.push(newFolder);
        this.notifyChange();
        return newFolder;
    }
    // ========== Sync ==========
    getSyncItems() {
        return [...this.syncItems];
    }
    getActiveSyncItems() {
        return this.syncItems.filter((s) => s.status === 'in-progress' || s.status === 'pending');
    }
    addSyncItem(fileName, action) {
        const item = {
            id: `sync-${String(this.nextSyncId++).padStart(3, '0')}`,
            fileName,
            action,
            status: 'pending',
            progress: 0,
        };
        this.syncItems.unshift(item);
        this.notifyChange();
        return item;
    }
    updateSyncProgress(syncId, progress) {
        const item = this.syncItems.find((s) => s.id === syncId);
        if (item) {
            item.progress = progress;
            if (progress === 100) {
                item.status = 'completed';
            }
            else if (progress > 0) {
                item.status = 'in-progress';
            }
            this.notifyChange();
        }
    }
    // ========== Analytics ==========
    getTotalFileCount() {
        return this.files.filter((f) => !f.isFolder).length;
    }
    getTotalFolderCount() {
        return this.files.filter((f) => f.isFolder).length;
    }
    getTotalStorageUsed() {
        return this.files.reduce((sum, f) => sum + f.size, 0);
    }
    getStoragePercentage() {
        const total = 5 * 1024 * 1024 * 1024; // 5GB
        return Math.round((this.getTotalStorageUsed() / total) * 100);
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}
exports.NextCloudStore = NextCloudStore;
// ============================================================================
// VIEW BUILDER
// ============================================================================
function buildNextCloudApp(a) {
    const store = new NextCloudStore();
    let selectedTab = 'files';
    let currentPath = '/';
    let accountStatusLabel;
    let storageLabel;
    let fileCountLabel;
    let syncProgressLabel;
    let viewStack;
    async function updateStatusLabels() {
        if (accountStatusLabel) {
            const account = store.getAccount();
            const status = account.isConnected ? '🟢 Connected' : '🔴 Disconnected';
            await accountStatusLabel.setText(`${status} • ${account.username} • ${account.server}`);
        }
        if (storageLabel) {
            const used = store.getTotalStorageUsed();
            const percentage = store.getStoragePercentage();
            await storageLabel.setText(`Storage: ${store.formatBytes(used)} (${percentage}% of 5GB)`);
        }
        if (fileCountLabel) {
            const files = store.getTotalFileCount();
            const folders = store.getTotalFolderCount();
            await fileCountLabel.setText(`📁 ${folders} folders | 📄 ${files} files`);
        }
        if (syncProgressLabel) {
            const activeSyncs = store.getActiveSyncItems();
            if (activeSyncs.length > 0) {
                const totalProgress = activeSyncs.reduce((sum, s) => sum + s.progress, 0) / activeSyncs.length;
                await syncProgressLabel.setText(`Syncing: ${Math.round(totalProgress)}%`);
            }
            else {
                await syncProgressLabel.setText('Sync: Up to date');
            }
        }
    }
    a.window({ title: 'NextCloud Desktop Client', width: 1100, height: 800 }, (win) => {
        win.setContent(() => {
            a.vbox(() => {
                // Header
                a.hbox(() => {
                    a.label('☁️ NextCloud').withId('app-title');
                    a.spacer();
                    accountStatusLabel = a.label('🔴 Disconnected').withId('account-status');
                });
                a.separator();
                // Tab Navigation
                a.hbox(() => {
                    a.button('📁 Files')
                        .withId('tab-files')
                        .onClick(async () => {
                        selectedTab = 'files';
                        currentPath = '/';
                        await viewStack.refresh();
                    });
                    a.button('🔄 Sync')
                        .withId('tab-sync')
                        .onClick(async () => {
                        selectedTab = 'sync';
                        await viewStack.refresh();
                    });
                    a.button('🔗 Shared')
                        .withId('tab-shared')
                        .onClick(async () => {
                        selectedTab = 'shared';
                        await viewStack.refresh();
                    });
                    a.button('⚙️ Account')
                        .withId('tab-account')
                        .onClick(async () => {
                        selectedTab = 'account';
                        await viewStack.refresh();
                    });
                });
                a.separator();
                // Status Labels
                a.hbox(() => {
                    a.vbox(() => {
                        storageLabel = a.label('Storage: 0 B (0%)').withId('storage-label');
                        fileCountLabel = a.label('📁 0 folders | 📄 0 files').withId('file-count');
                        syncProgressLabel = a.label('Sync: Up to date').withId('sync-progress');
                    });
                });
                a.separator();
                // Content Area
                viewStack = a.vbox(() => {
                    // Files Tab
                    a.vbox(() => {
                        a.label('Files').withId('files-title');
                        a.hbox(() => {
                            a.button('📤 Upload')
                                .withId('btn-upload')
                                .onClick(async () => {
                                const file = await win.showFileOpen();
                                if (file) {
                                    store.addSyncItem('document.pdf', 'upload');
                                }
                            });
                            a.button('➕ New Folder')
                                .withId('btn-new-folder')
                                .onClick(async () => {
                                const result = await win.showEntryDialog('New Folder', 'Folder name:');
                                if (result) {
                                    store.createFolder(currentPath, result);
                                }
                            });
                            a.button('🔍 Search')
                                .withId('btn-search')
                                .onClick(async () => {
                                const query = await win.showEntryDialog('Search', 'Search files:');
                                if (query) {
                                    const results = store.searchFiles(query);
                                    await win.showInfo('Search Results', `Found ${results.length} items`);
                                }
                            });
                        });
                        a.separator();
                        // File List
                        a.vbox(() => {
                            // Empty state
                        })
                            .bindTo({
                            items: () => store.getFiles(currentPath),
                            empty: () => {
                                a.label('No files in this folder');
                            },
                            render: (file) => {
                                const icon = file.isFolder ? '📁' : '📄';
                                const sharedIcon = file.shared ? ' 🔗' : '';
                                const size = file.isFolder ? '' : ` (${store.formatBytes(file.size)})`;
                                a.hbox(() => {
                                    a.label(`${icon} ${file.name}${sharedIcon}${size}`).withId(`file-${file.id}`);
                                    a.spacer();
                                    a.label(file.modified.toLocaleDateString()).withId(`file-date-${file.id}`);
                                    if (!file.isFolder) {
                                        a.button('🔗')
                                            .withId(`btn-share-${file.id}`)
                                            .onClick(() => store.shareFile(file.id));
                                        a.button('🗑️')
                                            .withId(`btn-delete-${file.id}`)
                                            .onClick(() => store.deleteFile(file.id));
                                    }
                                });
                            },
                            trackBy: (file) => file.id,
                        });
                    }).when(() => selectedTab === 'files');
                    // Sync Tab
                    a.vbox(() => {
                        a.label('Sync Status').withId('sync-title');
                        a.hbox(() => {
                            a.button('⬆️ Upload File')
                                .withId('btn-upload-sync')
                                .onClick(() => {
                                store.addSyncItem('presentation.pptx', 'upload');
                            });
                            a.button('⬇️ Download File')
                                .withId('btn-download-sync')
                                .onClick(() => {
                                store.addSyncItem('archive.zip', 'download');
                            });
                            a.spacer();
                            a.button('🔄 Sync Now')
                                .withId('btn-sync-now')
                                .onClick(async () => {
                                store.addSyncItem('sync-all', 'sync');
                            });
                        });
                        a.separator();
                        // Sync List
                        a.vbox(() => {
                            // Empty state
                        })
                            .bindTo({
                            items: () => store.getSyncItems(),
                            empty: () => {
                                a.label('No sync items');
                            },
                            render: (item) => {
                                const statusIcon = {
                                    pending: '⏳',
                                    'in-progress': '⚙️',
                                    completed: '✅',
                                    error: '❌',
                                }[item.status];
                                const progressBar = '█'.repeat(Math.floor(item.progress / 10)) +
                                    '░'.repeat(10 - Math.floor(item.progress / 10));
                                a.hbox(() => {
                                    a.vbox(() => {
                                        a.label(`${statusIcon} ${item.action.toUpperCase()}: ${item.fileName}`).withId(`sync-${item.id}`);
                                        a.label(`${progressBar} ${item.progress}%`).withId(`sync-progress-${item.id}`);
                                    });
                                });
                            },
                            trackBy: (item) => item.id,
                        });
                    }).when(() => selectedTab === 'sync');
                    // Shared Tab
                    a.vbox(() => {
                        a.label('Shared Files').withId('shared-title');
                        a.hbox(() => {
                            a.button('🔄 Refresh')
                                .withId('btn-refresh-shared')
                                .onClick(async () => {
                                await viewStack.refresh();
                            });
                        });
                        a.separator();
                        a.vbox(() => {
                            // Empty state
                        })
                            .bindTo({
                            items: () => store.getSharedFiles(),
                            empty: () => {
                                a.label('No shared files');
                            },
                            render: (file) => {
                                a.hbox(() => {
                                    a.label(`📄 ${file.name}`).withId(`shared-${file.id}`);
                                    a.spacer();
                                    a.label(`${store.formatBytes(file.size)}`).withId(`shared-size-${file.id}`);
                                    a.button('🗑️')
                                        .withId(`btn-unshare-${file.id}`)
                                        .onClick(() => store.shareFile(file.id));
                                });
                            },
                            trackBy: (file) => file.id,
                        });
                    }).when(() => selectedTab === 'shared');
                    // Account Tab
                    a.vbox(() => {
                        a.label('Account Settings').withId('account-title');
                        a.separator();
                        let accountInfo;
                        const account = store.getAccount();
                        a.vbox(() => {
                            a.label(`Username: ${account.username}`).withId('account-username');
                            a.label(`Email: ${account.email}`).withId('account-email');
                            a.label(`Server: ${account.server}`).withId('account-server');
                            a.label(`Last Sync: ${account.lastSync.toLocaleString()}`).withId('account-lastsync');
                            a.separator();
                            a.hbox(() => {
                                a.label('Auto-sync enabled:');
                                a.label(account.syncEnabled ? '✅ Yes' : '❌ No').withId('account-sync-status');
                            });
                        });
                        a.separator();
                        a.hbox(() => {
                            a.button('✅ Connect Account')
                                .withId('btn-connect')
                                .onClick(async () => {
                                const result = await win.showForm('Connect to NextCloud', [
                                    { type: 'entry', label: 'Server URL', key: 'server' },
                                    { type: 'entry', label: 'Username', key: 'username' },
                                    { type: 'password', label: 'Password', key: 'password' },
                                ]);
                                if (result.submitted) {
                                    store.connectAccount(result.values.server, result.values.username, result.values.password);
                                }
                            });
                            a.button('❌ Disconnect')
                                .withId('btn-disconnect')
                                .onClick(() => {
                                store.disconnectAccount();
                            });
                            a.spacer();
                            a.button(account.syncEnabled ? 'Disable Sync' : 'Enable Sync')
                                .withId('btn-toggle-sync')
                                .onClick(() => {
                                store.toggleSync(!account.syncEnabled);
                            });
                        });
                    }).when(() => selectedTab === 'account');
                });
            });
        });
        // Subscribe to store changes
        store.subscribe(async () => {
            await updateStatusLabels();
            await viewStack.refresh();
        });
        // Initial setup
        (async () => {
            await updateStatusLabels();
        })();
        win.show();
    });
}
exports.default = buildNextCloudApp;
//# sourceMappingURL=index.js.map