import { Context } from '../context';
import { Widget } from './base';

/**
 * Available theme icon names for the Icon widget
 */
export type ThemeIconName =
  // Standard icons
  | 'cancel' | 'confirm' | 'delete' | 'search' | 'searchReplace'
  // Media icons
  | 'mediaPlay' | 'mediaPause' | 'mediaStop' | 'mediaRecord' | 'mediaReplay'
  | 'mediaSkipNext' | 'mediaSkipPrevious' | 'mediaFastForward' | 'mediaFastRewind'
  // Navigation icons
  | 'home' | 'menu' | 'menuExpand' | 'moveDown' | 'moveUp' | 'navigate'
  | 'arrowBack' | 'arrowForward'
  // File icons
  | 'file' | 'fileApplication' | 'fileAudio' | 'fileImage' | 'fileText' | 'fileVideo'
  | 'folder' | 'folderNew' | 'folderOpen'
  // Document icons
  | 'document' | 'documentCreate' | 'documentSave' | 'documentPrint'
  // Content icons
  | 'content' | 'contentAdd' | 'contentClear' | 'contentCopy' | 'contentCut'
  | 'contentPaste' | 'contentRedo' | 'contentRemove' | 'contentUndo'
  // View icons
  | 'viewFullScreen' | 'viewRefresh' | 'viewZoomFit' | 'viewZoomIn' | 'viewZoomOut'
  | 'viewRestore' | 'visibility' | 'visibilityOff'
  // Status icons
  | 'info' | 'question' | 'warning' | 'error' | 'help' | 'history'
  // Action icons
  | 'settings' | 'mailAttachment' | 'mailCompose' | 'mailForward' | 'mailReply'
  | 'mailReplyAll' | 'mailSend'
  // Volume icons
  | 'volumeDown' | 'volumeMute' | 'volumeUp'
  // Misc icons
  | 'download' | 'upload' | 'computer' | 'storage' | 'account' | 'login' | 'logout'
  | 'list' | 'grid' | 'colorChromatic' | 'colorPalette'
  // Checkbox icons
  | 'checkButtonChecked' | 'checkButton' | 'radioButton' | 'radioButtonChecked';

/**
 * Icon widget - displays a theme icon
 * Shows standard Fyne theme icons that automatically adapt to light/dark themes
 */
export class Icon extends Widget {
  private iconName: ThemeIconName;

  constructor(ctx: Context, iconName: ThemeIconName) {
    const id = ctx.generateId('icon');
    super(ctx, id);
    this.iconName = iconName;

    ctx.bridge.send('createIcon', { id, iconName });
    ctx.addToCurrentContainer(id);
  }

  /**
   * Change the displayed icon
   * @param iconName The name of the theme icon to display
   */
  async setResource(iconName: ThemeIconName): Promise<void> {
    this.iconName = iconName;
    await this.ctx.bridge.send('setIconResource', {
      widgetId: this.id,
      iconName
    });
  }

  /**
   * Get the current icon name
   */
  getIconName(): ThemeIconName {
    return this.iconName;
  }
}

/**
 * FileIcon widget - displays a file type icon
 * Shows appropriate icons based on file type/extension with optional selection state
 */
export class FileIcon extends Widget {
  constructor(ctx: Context, path: string) {
    const id = ctx.generateId('fileicon');
    super(ctx, id);

    ctx.bridge.send('createFileIcon', { id, path });
    ctx.addToCurrentContainer(id);
  }

  /**
   * Set the file path for this icon
   * @param path The path to the file (used to determine icon type)
   */
  async setURI(path: string): Promise<void> {
    await this.ctx.bridge.send('setFileIconURI', {
      widgetId: this.id,
      path
    });
  }

  /**
   * Set the selection state of the file icon
   * @param selected Whether the icon appears selected
   */
  async setSelected(selected: boolean): Promise<void> {
    await this.ctx.bridge.send('setFileIconSelected', {
      widgetId: this.id,
      selected
    });
  }
}

/**
 * Label widget
 */
export class Label extends Widget {
  constructor(ctx: Context, text: string, className?: string, alignment?: 'leading' | 'trailing' | 'center', wrapping?: 'off' | 'break' | 'word', textStyle?: { bold?: boolean; italic?: boolean; monospace?: boolean }) {
    const id = ctx.generateId('label');
    super(ctx, id);

    const payload: any = { id, text };

    if (alignment) {
      payload.alignment = alignment;
    }

    if (wrapping) {
      payload.wrapping = wrapping;
    }

    if (textStyle) {
      payload.textStyle = textStyle;
    }

    ctx.bridge.send('createLabel', payload);
    ctx.addToCurrentContainer(id);

    // Apply styles from stylesheet (non-blocking) - try class names first, then fall back to 'label'
    if (className) {
      this.applyStyles(className).catch(() => {});
    } else {
      this.applyStyles('label').catch(() => {});
    }
  }
}

/**
 * Separator widget (horizontal or vertical line)
 */
export class Separator {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.id = ctx.generateId('separator');

    ctx.bridge.send('createSeparator', { id: this.id });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Spacer widget (expanding empty space)
 * Uses Fyne's layout.NewSpacer() to create flexible spacing in layouts
 */
export class Spacer {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.id = ctx.generateId('spacer');

    ctx.bridge.send('createSpacer', { id: this.id });
    ctx.addToCurrentContainer(this.id);
  }
}

/**
 * Hyperlink widget (clickable URL)
 */
export class Hyperlink {
  private ctx: Context;
  public id: string;

  constructor(ctx: Context, text: string, url: string) {
    this.ctx = ctx;
    this.id = ctx.generateId('hyperlink');

    ctx.bridge.send('createHyperlink', { id: this.id, text, url });
    ctx.addToCurrentContainer(this.id);
  }
}
