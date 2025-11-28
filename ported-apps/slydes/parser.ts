/**
 * Markdown parser for slide presentations
 *
 * Parses markdown with TOML/YAML front matter and splits into slides
 * based on --- dividers (horizontal rules).
 */

const marked = require('marked');
const matter = require('gray-matter');
const toml = require('toml');

export interface SlideConfig {
  theme?: string;
  [key: string]: any;
}

export interface SlideContent {
  heading: string;
  subheading: string;
  content: string; // Rendered HTML
  rawMarkdown: string; // Original markdown for this slide
}

export interface ParsedPresentation {
  config: SlideConfig;
  slides: SlideContent[];
}

/**
 * Parse a markdown presentation file
 * @param markdown Full markdown content with optional front matter
 * @returns Parsed presentation with config and slides
 */
export function parsePresentation(markdown: string): ParsedPresentation {
  // Parse front matter (supports TOML, YAML, JSON)
  const { data: config, content } = matter(markdown, {
    // Support TOML format like slydes (using +++ delimiters)
    delimiters: ['+++', '+++'],
    engines: {
      toml: toml.parse.bind(toml)
    },
    language: 'toml'
  });

  // Split content by slide dividers (---)
  const slideTexts = splitIntoSlides(content);

  // Parse each slide
  const slides = slideTexts.map(text => parseSlide(text));

  return {
    config: config as SlideConfig,
    slides,
  };
}

/**
 * Split markdown content into individual slides
 * @param content Markdown content (without front matter)
 * @returns Array of markdown strings, one per slide
 */
function splitIntoSlides(content: string): string[] {
  const lines = content.split('\n');
  const slides: string[] = [];
  let currentSlide: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---') {
      // Slide divider
      if (currentSlide.length > 0) {
        slides.push(currentSlide.join('\n'));
        currentSlide = [];
      }
    } else {
      currentSlide.push(line);
    }
  }

  // Add the last slide
  if (currentSlide.length > 0) {
    slides.push(currentSlide.join('\n'));
  }

  // Ensure at least one slide
  if (slides.length === 0) {
    slides.push('');
  }

  return slides;
}

/**
 * Parse a single slide's markdown content
 * @param markdown Markdown for one slide
 * @returns Parsed slide content
 */
function parseSlide(markdown: string): SlideContent {
  const trimmed = markdown.trim();

  // Extract heading and subheading
  const lines = trimmed.split('\n');
  let heading = '';
  let subheading = '';
  let contentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('# ') && !heading) {
      heading = line.substring(2).trim();
      contentStart = i + 1;
    } else if (line.startsWith('## ') && !subheading) {
      subheading = line.substring(3).trim();
      contentStart = i + 1;
    } else if (line && !line.startsWith('#')) {
      // Found content, stop looking for headings
      break;
    }
  }

  // Get remaining content after headings
  const contentLines = lines.slice(contentStart);
  const contentMarkdown = contentLines.join('\n').trim();

  // Render markdown to HTML
  const content = contentMarkdown ? marked.parse(contentMarkdown) as string : '';

  return {
    heading,
    subheading,
    content,
    rawMarkdown: markdown,
  };
}

/**
 * Get the count of slides in a markdown presentation
 * @param markdown Full markdown content
 * @returns Number of slides
 */
export function getSlideCount(markdown: string): number {
  const { content } = matter(markdown, {
    delimiters: ['+++', '+++'],
    engines: {
      toml: toml.parse.bind(toml)
    },
    language: 'toml'
  });
  return splitIntoSlides(content).length;
}
