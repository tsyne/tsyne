export interface Message {
    id: string;
    type: string;
    payload: Record<string, any>;
}
export interface Response {
    id: string;
    success: boolean;
    result?: Record<string, any>;
    error?: string;
}
export interface Event {
    type: string;
    widgetId: string;
    data?: Record<string, any>;
}
export declare class BridgeConnection {
    private process;
    private messageId;
    private pendingRequests;
    private eventHandlers;
    private readyPromise;
    private readyResolve?;
    private buffer;
    private readingFrame;
    constructor(testMode?: boolean);
    /**
     * Try to read one complete framed message from the buffer
     * Returns true if a message was read, false if more data is needed
     */
    private tryReadFrame;
    private handleResponse;
    private handleEvent;
    /**
     * Wait for the bridge to be ready to receive commands
     */
    waitUntilReady(): Promise<void>;
    send(type: string, payload: Record<string, any>): Promise<any>;
    registerEventHandler(callbackId: string, handler: (data: any) => void): void;
    registerCustomId(widgetId: string, customId: string): Promise<any>;
    getParent(widgetId: string): Promise<string>;
    clickToolbarAction(toolbarId: string, actionLabel: string): Promise<any>;
    quit(): void;
}
