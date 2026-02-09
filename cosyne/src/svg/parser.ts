/**
 * Lightweight SVG XML parser
 *
 * Regex-based, no external dependencies. Parses SVG strings into an SvgNode tree.
 * Handles self-closing tags, nested elements, text content, and common SVG patterns.
 */

import { SvgNode } from './types';

/**
 * Parse an SVG string into an SvgNode tree.
 */
export function parseSvg(svgString: string): SvgNode {
  // Strip XML declaration, DOCTYPE, and comments
  let s = svgString
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const tokens = tokenize(s);
  const root = buildTree(tokens);

  if (!root) {
    return { tag: 'svg', attrs: {}, children: [] };
  }

  return root;
}

interface Token {
  type: 'open' | 'close' | 'selfClose' | 'text';
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
}

/**
 * Tokenize SVG string into open/close/selfClose/text tokens.
 */
function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < s.length) {
    // Skip whitespace between tags (but not within text content)
    if (s[pos] === '<') {
      // Closing tag
      if (s[pos + 1] === '/') {
        const end = s.indexOf('>', pos);
        if (end === -1) break;
        const tag = s.substring(pos + 2, end).trim();
        tokens.push({ type: 'close', tag });
        pos = end + 1;
        continue;
      }

      // Opening or self-closing tag
      const tagEnd = findTagEnd(s, pos);
      if (tagEnd === -1) break;

      const tagContent = s.substring(pos + 1, tagEnd);
      const isSelfClosing = tagContent.endsWith('/');
      const content = isSelfClosing ? tagContent.slice(0, -1).trim() : tagContent.trim();

      // Extract tag name and attributes
      const spaceIdx = content.search(/[\s\n\r]/);
      let tag: string;
      let attrString: string;
      if (spaceIdx === -1) {
        tag = content;
        attrString = '';
      } else {
        tag = content.substring(0, spaceIdx);
        attrString = content.substring(spaceIdx + 1);
      }

      const attrs = parseAttributes(attrString);

      tokens.push({
        type: isSelfClosing ? 'selfClose' : 'open',
        tag,
        attrs,
      });

      pos = tagEnd + 1;
      continue;
    }

    // Text content between tags
    const nextTag = s.indexOf('<', pos);
    const text = (nextTag === -1 ? s.substring(pos) : s.substring(pos, nextTag)).trim();
    if (text) {
      tokens.push({ type: 'text', text });
    }
    pos = nextTag === -1 ? s.length : nextTag;
  }

  return tokens;
}

/**
 * Find the closing '>' of a tag, respecting quoted attribute values.
 */
function findTagEnd(s: string, start: number): number {
  let inQuote: string | null = null;
  for (let i = start + 1; i < s.length; i++) {
    const ch = s[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

/**
 * Parse attribute string into key-value pairs.
 * Handles: attr="val", attr='val', and boolean attrs.
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attrString) return attrs;

  // Match attr="value" or attr='value'
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }

  return attrs;
}

/**
 * Build an SvgNode tree from tokens.
 */
function buildTree(tokens: Token[]): SvgNode | null {
  const stack: SvgNode[] = [];
  let root: SvgNode | null = null;

  for (const token of tokens) {
    switch (token.type) {
      case 'open': {
        const node: SvgNode = {
          tag: token.tag!,
          attrs: token.attrs || {},
          children: [],
        };
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        }
        stack.push(node);
        if (!root) root = node;
        break;
      }
      case 'selfClose': {
        const node: SvgNode = {
          tag: token.tag!,
          attrs: token.attrs || {},
          children: [],
        };
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          if (!root) root = node;
        }
        break;
      }
      case 'close': {
        if (stack.length > 1) {
          stack.pop();
        } else if (stack.length === 1) {
          // Closing root element
          root = stack.pop()!;
        }
        break;
      }
      case 'text': {
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          if (parent.text) {
            parent.text += ' ' + token.text;
          } else {
            parent.text = token.text;
          }
        }
        break;
      }
    }
  }

  return root;
}

/**
 * Parse a viewBox string like "0 0 100 100" into components.
 */
export function parseViewBox(viewBox: string): { minX: number; minY: number; width: number; height: number } | null {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}
