#!/usr/bin/env node
/**
 * Show source code with syntax highlighting for TypeScript/JavaScript
 * Uses highlight.js for accurate syntax highlighting
 * Usage: node show-source.js <filepath>
 */

const fs = require('fs');
const path = require('path');
const hljs = require('highlight.js');

// ANSI color code mappings for highlight.js token types
const tokenToAnsi: Record<string, string> = {
  // Comments
  'hljs-comment': '\x1b[90m',           // bright black (gray)
  // Strings
  'hljs-string': '\x1b[32m',            // green
  'hljs-literal': '\x1b[32m',           // green
  // Numbers
  'hljs-number': '\x1b[33m',            // yellow
  // Keywords
  'hljs-keyword': '\x1b[35m',           // magenta
  'hljs-built_in': '\x1b[36m',          // cyan
  // Functions, attributes
  'hljs-title': '\x1b[36m',             // cyan
  'hljs-attr': '\x1b[33m',              // yellow
  'hljs-name': '\x1b[36m',              // cyan
  // Operators, punctuation
  'hljs-operator': '\x1b[37m',          // white
  'hljs-punctuation': '\x1b[37m',       // white
  // Types
  'hljs-type': '\x1b[34m',              // blue
  // Default
  '': '\x1b[0m'                         // reset
};

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#39;': "'",
    '&nbsp;': ' '
  };
  return text.replace(/&[a-z]+;|&#[0-9]+;|&#x[0-9a-f]+;/gi, (match: string) => entities[match] || match);
}

function convertToAnsi(html: string): string {
  // Remove HTML tags and convert to ANSI codes
  let result = '';
  let i = 0;

  while (i < html.length) {
    // Find opening tag
    if (html[i] === '<') {
      const closeIdx = html.indexOf('>', i);
      if (closeIdx === -1) break;

      const tag = html.slice(i + 1, closeIdx);

      // Handle closing tags
      if (tag.startsWith('/')) {
        result += '\x1b[0m'; // reset
        i = closeIdx + 1;
        continue;
      }

      // Extract class name from opening tag
      const classMatch = tag.match(/class="([^"]*)"/);
      const className = classMatch ? classMatch[1] : '';
      const ansiCode = tokenToAnsi[className] || '';
      result += ansiCode;
      i = closeIdx + 1;
      continue;
    }

    // Regular content
    result += html[i];
    i++;
  }

  return decodeHtmlEntities(result) + '\x1b[0m'; // final reset
}

// Main
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node show-source.js <filepath>');
  process.exit(1);
}

try {
  const code = fs.readFileSync(filePath, 'utf-8');

  // Print banner with fully qualified path
  const fullPath = path.resolve(filePath);
  const banner = '━'.repeat(80);
  console.log(`\n${banner}`);
  console.log(`📄 ${fullPath}`);
  console.log(`${banner}\n`);

  // Detect language based on file extension
  const ext = path.extname(filePath);
  let language = 'typescript';
  if (ext === '.js') language = 'javascript';
  if (ext === '.ts' || ext === '.tsx') language = 'typescript';

  // Highlight the code
  const highlighted = hljs.highlight(code, { language, ignoreIllegals: true });
  const ansiOutput = convertToAnsi(highlighted.value);

  console.log(ansiOutput);
  console.log(`\n${banner}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}
