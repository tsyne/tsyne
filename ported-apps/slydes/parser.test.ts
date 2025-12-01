/**
 * Unit tests for markdown parser
 */

import { parsePresentation, getSlideCount, SlideContent } from './parser';

describe('Markdown Parser', () => {
  describe('parsePresentation', () => {
    test('should parse simple single slide', () => {
      const markdown = '# Hello World\n\nThis is content.';
      const result = parsePresentation(markdown);

      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].heading).toBe('Hello World');
      expect(result.slides[0].subheading).toBe('');
      expect(result.slides[0].content).toContain('This is content');
    });

    test('should parse multiple slides separated by ---', () => {
      const markdown = `# Slide 1

Content for slide 1

---

# Slide 2

Content for slide 2`;

      const result = parsePresentation(markdown);

      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].heading).toBe('Slide 1');
      expect(result.slides[1].heading).toBe('Slide 2');
    });

    test('should parse heading and subheading', () => {
      const markdown = `# Main Heading
## Subheading

Content here`;

      const result = parsePresentation(markdown);

      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].heading).toBe('Main Heading');
      expect(result.slides[0].subheading).toBe('Subheading');
      expect(result.slides[0].content).toContain('Content here');
    });

    test('should parse TOML front matter', () => {
      const markdown = `+++
theme = "dark"
author = "Test"
+++

# Slide 1

Content`;

      const result = parsePresentation(markdown);

      expect(result.config.theme).toBe('dark');
      expect(result.config.author).toBe('Test');
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].heading).toBe('Slide 1');
    });

    test('should handle empty markdown', () => {
      const markdown = '';
      const result = parsePresentation(markdown);

      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].heading).toBe('');
      expect(result.slides[0].content).toBe('');
    });

    test('should parse markdown lists as HTML', () => {
      const markdown = `# Bullets

* First item
* Second item
* Third item`;

      const result = parsePresentation(markdown);

      expect(result.slides[0].content).toContain('<li>');
      expect(result.slides[0].content).toContain('First item');
      expect(result.slides[0].content).toContain('Second item');
    });

    test('should parse code blocks', () => {
      const markdown = `# Code Example

\`\`\`javascript
function hello() {
  console.error("Hello!");
}
\`\`\``;

      const result = parsePresentation(markdown);

      expect(result.slides[0].content).toContain('hello()');
      expect(result.slides[0].content).toContain('console.log');
    });

    test('should handle slide with only heading', () => {
      const markdown = '# Just a Title';
      const result = parsePresentation(markdown);

      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].heading).toBe('Just a Title');
      expect(result.slides[0].subheading).toBe('');
      expect(result.slides[0].content).toBe('');
    });

    test('should handle multiple consecutive dividers', () => {
      const markdown = `# Slide 1

---

---

# Slide 2`;

      const result = parsePresentation(markdown);

      // Should skip empty slides created by consecutive dividers
      expect(result.slides.length).toBeGreaterThan(0);
      expect(result.slides[0].heading).toBe('Slide 1');
    });

    test('should preserve raw markdown', () => {
      const markdown = '# Test\n\nContent';
      const result = parsePresentation(markdown);

      expect(result.slides[0].rawMarkdown).toContain('# Test');
      expect(result.slides[0].rawMarkdown).toContain('Content');
    });
  });

  describe('getSlideCount', () => {
    test('should count single slide', () => {
      const markdown = '# Single Slide';
      expect(getSlideCount(markdown)).toBe(1);
    });

    test('should count multiple slides', () => {
      const markdown = `# Slide 1
---
# Slide 2
---
# Slide 3`;

      expect(getSlideCount(markdown)).toBe(3);
    });

    test('should handle empty markdown', () => {
      expect(getSlideCount('')).toBe(1);
    });

    test('should ignore front matter when counting', () => {
      const markdown = `+++
theme = "dark"
+++

# Slide 1
---
# Slide 2`;

      expect(getSlideCount(markdown)).toBe(2);
    });
  });
});
