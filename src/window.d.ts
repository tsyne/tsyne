import { Context } from './context';
export interface WindowOptions {
    title: string;
    width?: number;
    height?: number;
    fixedSize?: boolean;
}
/**
 * Window represents a Fyne window
 */
export declare class Window {
    private ctx;
    id: string;
    private contentId?;
    private contentSent;
    constructor(ctx: Context, options: WindowOptions, builder?: (win: Window) => void);
    show(): Promise<void>;
    setContent(builder: () => void): Promise<void>;
    /**
     * Shows an information dialog with a title and message
     */
    showInfo(title: string, message: string): Promise<void>;
    /**
     * Shows an error dialog with a title and message
     */
    showError(title: string, message: string): Promise<void>;
    /**
     * Shows a confirmation dialog and returns the user's response
     * @returns Promise<boolean> - true if user confirmed, false if cancelled
     */
    showConfirm(title: string, message: string): Promise<boolean>;
    /**
     * Shows a file open dialog and returns the selected file path
     * @returns Promise<string | null> - file path if selected, null if cancelled
     */
    showFileOpen(): Promise<string | null>;
    /**
     * Shows a file save dialog and returns the selected file path
     * @returns Promise<string | null> - file path if selected, null if cancelled
     */
    showFileSave(filename?: string): Promise<string | null>;
    /**
     * Resize the window to the specified dimensions
     */
    resize(width: number, height: number): Promise<void>;
    /**
     * Set the window title
     */
    setTitle(title: string): void;
    /**
     * Center the window on the screen
     */
    centerOnScreen(): Promise<void>;
    /**
     * Set fullscreen mode
     */
    setFullScreen(fullscreen: boolean): Promise<void>;
    /**
     * Set the main menu for this window
     */
    setMainMenu(menuDefinition: Array<{
        label: string;
        items: Array<{
            label: string;
            onSelected?: () => void;
            isSeparator?: boolean;
            disabled?: boolean;
            checked?: boolean;
        }>;
    }>): Promise<void>;
    /**
     * Captures a screenshot of the window and saves it to a file
     * @param filePath - Path where the screenshot will be saved as PNG
     */
    screenshot(filePath: string): Promise<void>;
}
