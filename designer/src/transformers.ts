/**
 * Source Code Transformation Plugin System
 *
 * Provides a pluggable architecture for last-minute corrections to generated source
 * before saving. This allows for:
 * - Whitespace normalization
 * - Linting/formatting
 * - Comment preservation
 * - Future: LLM-based arbitration
 */

export interface TransformContext {
  /** Original source code (before designer edits) */
  originalSource: string;

  /** Candidate source code (after designer edits, before transformation) */
  candidateSource: string;

  /** File path being saved */
  filePath: string;

  /** Metadata about widgets in the file */
  metadata: any;

  /** Edits that were applied */
  edits: any[];
}

export interface TransformResult {
  /** Final source code to save */
  source: string;

  /** Optional warnings/messages to log */
  warnings?: string[];

  /** Whether any transformations were applied */
  transformed: boolean;
}

/**
 * Base interface for source transformers
 */
export interface SourceTransformer {
  /**
   * Name of the transformer (for logging/debugging)
   */
  name: string;

  /**
   * Transform candidate source before saving
   *
   * @param context - Context containing original and candidate source
   * @returns Transformed source and metadata
   */
  transform(context: TransformContext): TransformResult | Promise<TransformResult>;
}

/**
 * No-op transformer (default implementation)
 * Returns candidate source unchanged
 */
export class NoOpTransformer implements SourceTransformer {
  name = 'NoOp';

  transform(context: TransformContext): TransformResult {
    return {
      source: context.candidateSource,
      transformed: false
    };
  }
}

/**
 * Composite transformer - chains multiple transformers
 */
export class CompositeTransformer implements SourceTransformer {
  name = 'Composite';

  constructor(private transformers: SourceTransformer[]) {}

  async transform(context: TransformContext): Promise<TransformResult> {
    let currentSource = context.candidateSource;
    const allWarnings: string[] = [];
    let anyTransformed = false;

    for (const transformer of this.transformers) {
      const result = await transformer.transform({
        ...context,
        candidateSource: currentSource
      });

      currentSource = result.source;
      anyTransformed = anyTransformed || result.transformed;

      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    }

    return {
      source: currentSource,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      transformed: anyTransformed
    };
  }
}

/**
 * Whitespace normalizer - preserves original indentation style
 */
export class WhitespaceNormalizer implements SourceTransformer {
  name = 'WhitespaceNormalizer';

  transform(context: TransformContext): TransformResult {
    const originalIndent = this.detectIndentation(context.originalSource);
    const candidateIndent = this.detectIndentation(context.candidateSource);

    // If indentation differs, normalize to original
    if (originalIndent !== candidateIndent) {
      const normalized = this.normalizeIndentation(
        context.candidateSource,
        candidateIndent,
        originalIndent
      );

      return {
        source: normalized,
        transformed: true,
        warnings: [`Normalized indentation from '${candidateIndent}' to '${originalIndent}'`]
      };
    }

    return {
      source: context.candidateSource,
      transformed: false
    };
  }

  private detectIndentation(source: string): string {
    // Look for first indented line
    const match = source.match(/\n(\s+)\S/);
    if (!match) return '  '; // Default to 2 spaces

    const indent = match[1];

    // Detect tabs vs spaces
    if (indent.includes('\t')) {
      return '\t';
    }

    // Count spaces
    return ' '.repeat(indent.length);
  }

  private normalizeIndentation(
    source: string,
    fromIndent: string,
    toIndent: string
  ): string {
    const fromRegex = new RegExp(`^${fromIndent}`, 'gm');
    return source.replace(fromRegex, toIndent);
  }
}

/**
 * Comment preservation transformer
 * Attempts to restore comments from original source
 */
export class CommentPreserver implements SourceTransformer {
  name = 'CommentPreserver';

  transform(context: TransformContext): TransformResult {
    const warnings: string[] = [];
    let transformed = false;

    // Extract comments from original source
    const originalComments = this.extractComments(context.originalSource);

    if (originalComments.length === 0) {
      // No comments to preserve
      return {
        source: context.candidateSource,
        transformed: false
      };
    }

    let result = context.candidateSource;

    // Try to restore inline comments by matching line content
    for (const comment of originalComments) {
      if (comment.type === 'inline') {
        const lineMatch = this.findMatchingLine(
          context.candidateSource,
          comment.lineContent
        );

        if (lineMatch !== -1) {
          result = this.insertInlineComment(result, lineMatch, comment.text);
          transformed = true;
        } else {
          warnings.push(`Could not restore comment: ${comment.text}`);
        }
      }
    }

    return {
      source: result,
      transformed,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private extractComments(source: string): Array<{
    type: 'inline' | 'block';
    text: string;
    lineContent: string;
    lineNumber: number;
  }> {
    const comments: any[] = [];
    const lines = source.split('\n');

    lines.forEach((line, index) => {
      // Inline comments
      const inlineMatch = line.match(/^(.+?)\s*(\/\/.*)$/);
      if (inlineMatch) {
        comments.push({
          type: 'inline',
          text: inlineMatch[2],
          lineContent: inlineMatch[1].trim(),
          lineNumber: index
        });
      }

      // Block comments (simple detection)
      const blockMatch = line.match(/^\s*(\/\*.*?\*\/)/);
      if (blockMatch) {
        comments.push({
          type: 'block',
          text: blockMatch[1],
          lineContent: '',
          lineNumber: index
        });
      }
    });

    return comments;
  }

  private findMatchingLine(source: string, lineContent: string): number {
    const lines = source.split('\n');
    return lines.findIndex(line => line.trim().startsWith(lineContent));
  }

  private insertInlineComment(
    source: string,
    lineNumber: number,
    comment: string
  ): string {
    const lines = source.split('\n');
    lines[lineNumber] = lines[lineNumber].trimEnd() + ' ' + comment;
    return lines.join('\n');
  }
}

/**
 * Future: LLM-based transformer
 * Uses an LLM to arbitrate source differences and make intelligent corrections
 */
export class LLMTransformer implements SourceTransformer {
  name = 'LLMTransformer';

  constructor(
    private apiKey?: string,
    private model: string = 'claude-3-5-sonnet-20241022'
  ) {}

  async transform(context: TransformContext): Promise<TransformResult> {
    // TODO: Implement LLM-based transformation
    // This would:
    // 1. Send original + candidate source to LLM
    // 2. Ask it to preserve formatting, comments, etc.
    // 3. Return intelligently merged source

    return {
      source: context.candidateSource,
      transformed: false,
      warnings: ['LLM transformation not yet implemented']
    };
  }
}

/**
 * Global transformer registry
 */
class TransformerRegistry {
  private transformer: SourceTransformer = new NoOpTransformer();

  /**
   * Set the active transformer
   */
  setTransformer(transformer: SourceTransformer): void {
    this.transformer = transformer;
    console.log(`[Transformer] Active transformer set to: ${transformer.name}`);
  }

  /**
   * Get the active transformer
   */
  getTransformer(): SourceTransformer {
    return this.transformer;
  }

  /**
   * Reset to default (NoOp)
   */
  reset(): void {
    this.transformer = new NoOpTransformer();
  }
}

// Export singleton instance
export const transformerRegistry = new TransformerRegistry();
