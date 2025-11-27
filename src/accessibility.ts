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
  private currentSpeaker: any = null;
  private speechQueue: string[] = [];
  private isSpeaking: boolean = false;

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

    // Listen for pointer enter events to announce widgets
    this.ctx.bridge.on('pointerEnter', (data: any) => {
      console.log('[Accessibility] pointerEnter event received:', data);
      if (this.enabled && data.widgetId) {
        console.log('[Accessibility] Announcing widget:', data.widgetId);
        this.announceWidget(data.widgetId);
      } else {
        console.log('[Accessibility] Not announcing - enabled:', this.enabled, 'widgetId:', data.widgetId);
      }
    });

    // Listen for accessibility registration events from bridge
    this.ctx.bridge.on('accessibilityRegistered', (data: any) => {
      this.registerWidget(data.widgetId, {
        widgetId: data.widgetId,
        label: data.label,
        description: data.description,
        role: data.role,
        hint: data.hint,
        widgetType: data.widgetType,
        parentId: data.parentId
      });
    });
  }

  /**
   * Enable accessibility mode (TTS and assistive tools)
   */
  enable(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.ctx.bridge.send('enableAccessibility', { enabled: true });
    // Don't announce here - let the app provide context-specific messages
  }

  /**
   * Disable accessibility mode
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.ctx.bridge.send('enableAccessibility', { enabled: false });
    // Don't announce here - let the app provide context-specific messages
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
   * Resolve template variables in accessibility strings
   * Supports: ${label}, ${id}, ${role}, ${parent.label}, ${parent.role}, ${grandparent.label}
   */
  private resolveTemplate(template: string, widgetId: string): string {
    const info = this.widgetAccessibilityMap.get(widgetId);
    if (!info) return template;

    // Build context object with all available variables
    const context: any = {
      label: info.label || '',
      id: widgetId,
      role: info.role || '',
      parent: {},
      grandparent: {}
    };

    // Get parent info
    const parentId = this.widgetParentMap.get(widgetId);
    if (parentId) {
      const parentInfo = this.widgetAccessibilityMap.get(parentId);
      if (parentInfo) {
        context.parent = {
          label: parentInfo.label || '',
          role: parentInfo.role || '',
          id: parentId
        };

        // Get grandparent info
        const grandparentId = this.widgetParentMap.get(parentId);
        if (grandparentId) {
          const grandparentInfo = this.widgetAccessibilityMap.get(grandparentId);
          if (grandparentInfo) {
            context.grandparent = {
              label: grandparentInfo.label || '',
              role: grandparentInfo.role || '',
              id: grandparentId
            };
          }
        }
      }
    }

    // Replace template variables
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const keys = path.split('.');
      let value: any = context;

      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return '';
      }

      return value || '';
    });
  }

  /**
   * Announce widget information when pointer enters
   * Includes parent and grandparent context
   * Supports template strings with ${label}, ${parent.label}, etc.
   */
  /**
   * Announce widget on hover - just the label, keeping it brief
   * For cells with X or O, appends "with X" or "with O"
   */
  async announceWidget(widgetId: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const info = this.widgetAccessibilityMap.get(widgetId);
    if (!info) {
      return;
    }

    // For hover, just announce the label - keep it short
    let announcement = info.label ? this.resolveTemplate(info.label, widgetId) : info.widgetType;

    if (announcement) {
      // Check if widget has X or O text (for game cells)
      try {
        const result = await this.ctx.bridge.send('getText', { widgetId }) as { text?: string };
        const text = result.text?.trim();
        if (text === 'X' || text === 'O') {
          announcement += ` with ${text}`;
        }
      } catch {
        // Ignore errors - widget might not support getText
      }

      this.announce(announcement);
    }
  }

  /**
   * Announce text using TTS (queued to prevent overlapping)
   */
  announce(text: string): void {
    if (!this.enabled) return;

    console.log(`[TTS] ${text}`);

    // Add to queue
    this.speechQueue.push(text);

    // Start processing if not already speaking
    if (!this.isSpeaking) {
      this.processNextAnnouncement();
    }
  }

  /**
   * Process the next announcement in the queue
   */
  private processNextAnnouncement(): void {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const text = this.speechQueue.shift()!;

    // Use Web Speech API if available (browser environment)
    if (this.speechSynthesisAvailable) {
      try {
        // @ts-ignore - Browser API may not be available in all environments
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onend = () => this.processNextAnnouncement();
        // @ts-ignore
        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        // Fall through to system TTS
      }
    }

    // Use meSpeak for pure JS TTS (Node.js environment)
    try {
      const meSpeak = require('mespeak');

      // Load meSpeak voice data (required for speech synthesis)
      // This is a pure JS solution that doesn't require any native dependencies
      try {
        meSpeak.loadConfig(require('mespeak/src/mespeak_config.json'));
        meSpeak.loadVoice(require('mespeak/voices/en/en-us.json'));
      } catch (loadError) {
        // Voice already loaded or not available
      }

      // In Node.js, use raw output mode and pipe to speaker
      // @ts-ignore - window is not defined in Node.js
      if (typeof window === 'undefined') {
        try {
          const Speaker = require('speaker');

          // Get raw WAV audio data from meSpeak
          const wav = meSpeak.speak(text, {
            speed: 175,  // Normal speaking rate
            pitch: 50,   // Normal pitch
            volume: 100, // Full volume
            rawdata: 'buffer'  // Get raw audio buffer
          });

          if (wav) {
            // Calculate duration based on audio length (44100 samples per second)
            const duration = (wav.length - 44) / (22050 * 2); // 22050 Hz, 16-bit (2 bytes)

            // Create speaker with WAV format (22050 Hz, 16-bit, mono)
            const speaker = new Speaker({
              channels: 1,
              bitDepth: 16,
              sampleRate: 22050
            });

            // Process next announcement when this one finishes
            speaker.on('close', () => {
              setTimeout(() => this.processNextAnnouncement(), 100);
            });

            // Write the WAV data (skip 44-byte WAV header)
            speaker.write(Buffer.from(wav.slice(44)));
            speaker.end();
          } else {
            // No audio generated, move to next
            this.processNextAnnouncement();
          }
        } catch (speakerError) {
          // Fall back to browser mode or fail silently
          meSpeak.speak(text, {
            speed: 175,
            pitch: 50,
            volume: 100
          });
          // Can't detect when browser mode finishes, so just wait a bit
          setTimeout(() => this.processNextAnnouncement(), 2000);
        }
      } else {
        // Browser environment - use normal mode
        meSpeak.speak(text, {
          speed: 175,
          pitch: 50,
          volume: 100
        });
        // Can't detect when it finishes, so just wait a bit
        setTimeout(() => this.processNextAnnouncement(), 2000);
      }
    } catch (e) {
      // Silently fail if meSpeak is not available
      this.processNextAnnouncement();
    }

    // Also send to bridge for future native platform TTS support
    this.ctx.bridge.send('announce', { text }).catch(() => {
      // Ignore if bridge doesn't support announce yet
    });
  }

  /**
   * Stop any current speech and clear queue
   */
  stopSpeech(): void {
    // Clear the queue
    this.speechQueue = [];
    this.isSpeaking = false;

    // Stop current speaker if exists
    if (this.currentSpeaker) {
      try {
        this.currentSpeaker.end();
        this.currentSpeaker = null;
      } catch (e) {
        // Silently fail
      }
    }

    // Stop Web Speech API if available
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
 * Get the accessibility manager for a context
 * Uses proper IoC - each context has its own manager instance
 * This is the recommended way to access the accessibility manager
 */
export function getAccessibilityManager(ctx: Context): AccessibilityManager {
  return ctx.accessibilityManager;
}

/**
 * Enable accessibility mode for a context
 */
export function enableAccessibility(ctx: Context): void {
  ctx.accessibilityManager.enable();
}

/**
 * Disable accessibility mode for a context
 */
export function disableAccessibility(ctx: Context): void {
  ctx.accessibilityManager.disable();
}

/**
 * Toggle accessibility mode for a context
 */
export function toggleAccessibility(ctx: Context): void {
  ctx.accessibilityManager.toggle();
}

/**
 * @deprecated No longer needed - each context now has its own manager instance
 * Kept for backward compatibility but does nothing
 */
export function resetAccessibilityManager(): void {
  // No-op: Each context now has its own manager, so no global state to reset
}
