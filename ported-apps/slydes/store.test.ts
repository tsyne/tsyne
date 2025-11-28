/**
 * Integration tests for SlideStore
 */

import { SlideStore } from './store';

describe('SlideStore', () => {
  let store: SlideStore;

  beforeEach(() => {
    store = new SlideStore();
  });

  describe('initialization', () => {
    test('should initialize with default slide', () => {
      expect(store.getSlideCount()).toBe(1);
      expect(store.getCurrentIndex()).toBe(0);
    });

    test('should initialize with custom markdown', () => {
      const markdown = `# Slide 1
---
# Slide 2
---
# Slide 3`;

      const customStore = new SlideStore(markdown);
      expect(customStore.getSlideCount()).toBe(3);
    });
  });

  describe('markdown management', () => {
    test('should set and get markdown', () => {
      const markdown = '# Test Slide\n\nContent here';
      store.setMarkdown(markdown);

      expect(store.getMarkdown()).toBe(markdown);
    });

    test('should parse slides when markdown is set', () => {
      const markdown = `# Slide 1
---
# Slide 2`;

      store.setMarkdown(markdown);

      expect(store.getSlideCount()).toBe(2);
      expect(store.getSlide(0)?.heading).toBe('Slide 1');
      expect(store.getSlide(1)?.heading).toBe('Slide 2');
    });

    test('should reset current index if it exceeds new slide count', () => {
      const markdown = `# Slide 1
---
# Slide 2
---
# Slide 3`;

      store.setMarkdown(markdown);
      store.goToSlide(2); // Go to slide 3

      // Now set markdown with only 1 slide
      store.setMarkdown('# Only Slide');

      expect(store.getCurrentIndex()).toBe(0);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      const markdown = `# Slide 1
---
# Slide 2
---
# Slide 3`;
      store.setMarkdown(markdown);
    });

    test('should navigate to next slide', () => {
      expect(store.getCurrentIndex()).toBe(0);

      const result = store.nextSlide();

      expect(result).toBe(true);
      expect(store.getCurrentIndex()).toBe(1);
    });

    test('should not navigate past last slide', () => {
      store.goToSlide(2); // Last slide

      const result = store.nextSlide();

      expect(result).toBe(false);
      expect(store.getCurrentIndex()).toBe(2);
    });

    test('should navigate to previous slide', () => {
      store.goToSlide(1);

      const result = store.previousSlide();

      expect(result).toBe(true);
      expect(store.getCurrentIndex()).toBe(0);
    });

    test('should not navigate before first slide', () => {
      expect(store.getCurrentIndex()).toBe(0);

      const result = store.previousSlide();

      expect(result).toBe(false);
      expect(store.getCurrentIndex()).toBe(0);
    });

    test('should go to specific slide by index', () => {
      store.goToSlide(2);

      expect(store.getCurrentIndex()).toBe(2);
      expect(store.getCurrentSlide()?.heading).toBe('Slide 3');
    });

    test('should ignore invalid slide indices', () => {
      store.goToSlide(0);

      store.goToSlide(-1); // Invalid
      expect(store.getCurrentIndex()).toBe(0);

      store.goToSlide(999); // Invalid
      expect(store.getCurrentIndex()).toBe(0);
    });
  });

  describe('slide access', () => {
    beforeEach(() => {
      const markdown = `# First
## Subtitle

Content

---

# Second`;
      store.setMarkdown(markdown);
    });

    test('should get current slide', () => {
      const slide = store.getCurrentSlide();

      expect(slide).not.toBeNull();
      expect(slide?.heading).toBe('First');
      expect(slide?.subheading).toBe('Subtitle');
    });

    test('should get all slides', () => {
      const slides = store.getSlides();

      expect(slides).toHaveLength(2);
      expect(slides[0].heading).toBe('First');
      expect(slides[1].heading).toBe('Second');
    });

    test('should get slide by index', () => {
      const slide1 = store.getSlide(0);
      const slide2 = store.getSlide(1);

      expect(slide1?.heading).toBe('First');
      expect(slide2?.heading).toBe('Second');
    });

    test('should return null for invalid slide index', () => {
      expect(store.getSlide(-1)).toBeNull();
      expect(store.getSlide(999)).toBeNull();
    });
  });

  describe('state queries', () => {
    beforeEach(() => {
      const markdown = `# Slide 1
---
# Slide 2
---
# Slide 3`;
      store.setMarkdown(markdown);
    });

    test('should detect first slide', () => {
      store.goToSlide(0);
      expect(store.isFirstSlide()).toBe(true);

      store.goToSlide(1);
      expect(store.isFirstSlide()).toBe(false);
    });

    test('should detect last slide', () => {
      store.goToSlide(2);
      expect(store.isLastSlide()).toBe(true);

      store.goToSlide(1);
      expect(store.isLastSlide()).toBe(false);
    });

    test('should get slide count', () => {
      expect(store.getSlideCount()).toBe(3);
    });
  });

  describe('change notifications', () => {
    test('should notify listeners when markdown changes', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.setMarkdown('# New Slide');

      expect(listener).toHaveBeenCalled();
    });

    test('should notify listeners on navigation', () => {
      const markdown = `# Slide 1
---
# Slide 2`;
      store.setMarkdown(markdown);

      const listener = jest.fn();
      store.subscribe(listener);

      store.nextSlide();

      expect(listener).toHaveBeenCalled();
    });

    test('should notify listeners when going to specific slide', () => {
      const markdown = `# Slide 1
---
# Slide 2
---
# Slide 3`;
      store.setMarkdown(markdown);

      const listener = jest.fn();
      store.subscribe(listener);

      store.goToSlide(2);

      expect(listener).toHaveBeenCalled();
    });

    test('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);

      store.setMarkdown('# Test');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('should not notify if navigation fails', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      // Try to go next from last slide (should fail)
      store.goToSlide(0);
      listener.mockClear();

      store.previousSlide(); // Already at first slide

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    test('should parse and store configuration', () => {
      const markdown = `+++
theme = "dark"
author = "Test Author"
+++

# Slide 1`;

      store.setMarkdown(markdown);

      const config = store.getConfig();
      expect(config.theme).toBe('dark');
      expect(config.author).toBe('Test Author');
    });

    test('should handle empty configuration', () => {
      store.setMarkdown('# Slide 1');

      const config = store.getConfig();
      expect(config).toEqual({});
    });
  });
});
