/**
 * Tsyne Accessibility Manager
 * Provides TTS and assistive technology support with modal on/off control
 */

import { Context } from './context';

/**
 * Widget accessibility information
 */
interface WidgetAccessibilityInfo {
  widgetId: string;
  label?: string;
  description?: string;
  role?: string;
  hint?: string;
  widgetType?: string;
  parentId?: string;
}

/**
 * Accessibility Manager - handles TTS, screen reader support, and pointer tracking
 */
export class AccessibilityManager {
  private ctx: Context;
  private enabled: boolean = false;
  private widgetAccessibilityMap: Map<string, WidgetAccessibilityInfo> = new Map();
  private widgetParentMap: Map<string, string> = new Map();
  private speechSynthesisAvailable: boolean = false;

  constructor(ctx: Context) {
    this.ctx = ctx;

    // Check if speech synthesis is available (browser/Electron environment)
    try {
      // @ts-ignore - window may not be defined in Node environment
      if (typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
        this.speechSynthesisAvailable = true;
      }
    } catch (e) {
      // Not in browser environment
      this.speechSynthesisAvailable = false;
    }
  }

  /**
   * Enable accessibility mode (TTS and assistive tools)
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.ctx.bridge.send('enableAccessibility', { enabled: true });
    this.announce('Accessibility mode enabled');
  }

  /**
   * Disable accessibility mode
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.ctx.bridge.send('enableAccessibility', { enabled: false });
    this.announce('Accessibility mode disabled');
  }

  /**
   * Toggle accessibility mode on/off
   */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if accessibility mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register widget accessibility information
   */
  registerWidget(widgetId: string, info: WidgetAccessibilityInfo): void {
    this.widgetAccessibilityMap.set(widgetId, info);
    if (info.parentId) {
      this.widgetParentMap.set(widgetId, info.parentId);
    }
  }

  /**
   * Announce widget information when pointer enters
   * Includes parent and grandparent context
   */
  async announceWidget(widgetId: string): Promise<void> {
    if (!this.enabled) return;

    const info = this.widgetAccessibilityMap.get(widgetId);
    if (!info) return;

    // Build announcement with context
    const parts: string[] = [];

    // Add widget label or type
    if (info.label) {
      parts.push(info.label);
    } else if (info.widgetType) {
      parts.push(info.widgetType);
    }

    // Add role if specified
    if (info.role) {
      parts.push(`Role: ${info.role}`);
    }

    // Add description
    if (info.description) {
      parts.push(info.description);
    }

    // Add parent context
    const parentId = this.widgetParentMap.get(widgetId);
    if (parentId) {
      const parentInfo = this.widgetAccessibilityMap.get(parentId);
      if (parentInfo?.label) {
        parts.push(`In ${parentInfo.label}`);
      }

      // Add grandparent context
      const grandparentId = this.widgetParentMap.get(parentId);
      if (grandparentId) {
        const grandparentInfo = this.widgetAccessibilityMap.get(grandparentId);
        if (grandparentInfo?.label) {
          parts.push(`Within ${grandparentInfo.label}`);
        }
      }
    }

    // Add hint
    if (info.hint) {
      parts.push(`Hint: ${info.hint}`);
    }

    const announcement = parts.join('. ');
    this.announce(announcement);
  }

  /**
   * Announce text using TTS
   */
  announce(text: string): void {
    if (!this.enabled) return;

    // Use Web Speech API if available
    if (this.speechSynthesisAvailable) {
      try {
        // @ts-ignore - Browser API may not be available in all environments
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        // @ts-ignore
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Silently fail if speech synthesis is not available
      }
    }

    // Also send to bridge for native platform TTS
    this.ctx.bridge.send('announce', { text });

    // Log for debugging (use process.stdout in Node, console in browser)
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`[Accessibility] ${text}\n`);
    }
  }

  /**
   * Stop any current speech
   */
  stopSpeech(): void {
    if (this.speechSynthesisAvailable) {
      try {
        // @ts-ignore - Browser API
        window.speechSynthesis.cancel();
      } catch (e) {
        // Silently fail
      }
    }
    this.ctx.bridge.send('stopSpeech', {});
  }

  /**
   * Get accessibility info for a widget
   */
  getWidgetInfo(widgetId: string): WidgetAccessibilityInfo | undefined {
    return this.widgetAccessibilityMap.get(widgetId);
  }

  /**
   * Clear all registered widgets (useful for testing)
   */
  clear(): void {
    this.widgetAccessibilityMap.clear();
    this.widgetParentMap.clear();
  }
}

/**
 * Global accessibility manager instance
 */
let globalAccessibilityManager: AccessibilityManager | null = null;

/**
 * Initialize or get the global accessibility manager
 */
export function getAccessibilityManager(ctx: Context): AccessibilityManager {
  if (!globalAccessibilityManager) {
    globalAccessibilityManager = new AccessibilityManager(ctx);
  }
  return globalAccessibilityManager;
}

/**
 * Enable accessibility mode globally
 */
export function enableAccessibility(ctx: Context): void {
  getAccessibilityManager(ctx).enable();
}

/**
 * Disable accessibility mode globally
 */
export function disableAccessibility(ctx: Context): void {
  getAccessibilityManager(ctx).disable();
}

/**
 * Toggle accessibility mode globally
 */
export function toggleAccessibility(ctx: Context): void {
  getAccessibilityManager(ctx).toggle();
}
