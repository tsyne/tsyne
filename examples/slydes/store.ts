/**
 * Slide Store - MVC Model for presentation state
 *
 * Observable store pattern inspired by examples/todomvc.ts
 */

import { parsePresentation, SlideContent, SlideConfig } from './parser';

export type ChangeListener = () => void;

export class SlideStore {
  private slides: SlideContent[] = [];
  private currentSlideIndex: number = 0;
  private config: SlideConfig = {};
  private markdownSource: string = '';
  private changeListeners: ChangeListener[] = [];

  constructor(initialMarkdown: string = '# Slide 1\n') {
    this.setMarkdown(initialMarkdown);
  }

  /**
   * Subscribe to store changes
   * @param listener Callback invoked on any state change
   */
  subscribe(listener: ChangeListener): void {
    this.changeListeners.push(listener);
  }

  /**
   * Notify all listeners of a change
   */
  private notifyChange(): void {
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Set the markdown source and re-parse slides
   * @param markdown Full markdown presentation content
   */
  setMarkdown(markdown: string): void {
    this.markdownSource = markdown;
    const parsed = parsePresentation(markdown);
    this.slides = parsed.slides;
    this.config = parsed.config;

    // Ensure current index is valid
    if (this.currentSlideIndex >= this.slides.length) {
      this.currentSlideIndex = Math.max(0, this.slides.length - 1);
    }

    this.notifyChange();
  }

  /**
   * Get the current markdown source
   */
  getMarkdown(): string {
    return this.markdownSource;
  }

  /**
   * Get all parsed slides
   */
  getSlides(): SlideContent[] {
    return this.slides;
  }

  /**
   * Get the total number of slides
   */
  getSlideCount(): number {
    return this.slides.length;
  }

  /**
   * Get the current slide index (0-based)
   */
  getCurrentIndex(): number {
    return this.currentSlideIndex;
  }

  /**
   * Get the current slide content
   */
  getCurrentSlide(): SlideContent | null {
    if (this.currentSlideIndex >= 0 && this.currentSlideIndex < this.slides.length) {
      return this.slides[this.currentSlideIndex];
    }
    return null;
  }

  /**
   * Navigate to a specific slide by index
   * @param index 0-based slide index
   */
  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlideIndex = index;
      this.notifyChange();
    }
  }

  /**
   * Navigate to the next slide
   * @returns true if navigation occurred, false if already at last slide
   */
  nextSlide(): boolean {
    if (this.currentSlideIndex < this.slides.length - 1) {
      this.currentSlideIndex++;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Navigate to the previous slide
   * @returns true if navigation occurred, false if already at first slide
   */
  previousSlide(): boolean {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Get the presentation configuration
   */
  getConfig(): SlideConfig {
    return this.config;
  }

  /**
   * Check if we're at the first slide
   */
  isFirstSlide(): boolean {
    return this.currentSlideIndex === 0;
  }

  /**
   * Check if we're at the last slide
   */
  isLastSlide(): boolean {
    return this.currentSlideIndex === this.slides.length - 1;
  }

  /**
   * Get a specific slide by index
   * @param index 0-based slide index
   */
  getSlide(index: number): SlideContent | null {
    if (index >= 0 && index < this.slides.length) {
      return this.slides[index];
    }
    return null;
  }
}
