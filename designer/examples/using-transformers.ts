/**
 * Example: Using Source Transformers
 *
 * Shows how to configure different transformers for the designer
 */

import {
  transformerRegistry,
  NoOpTransformer,
  WhitespaceNormalizer,
  CommentPreserver,
  CompositeTransformer
} from '../src/transformers';

// Example 1: Default (NoOp) - No transformations
console.log('=== Example 1: NoOp Transformer ===');
transformerRegistry.setTransformer(new NoOpTransformer());
// Designer will save exactly what it generates

// Example 2: Whitespace Normalization
console.log('\n=== Example 2: Whitespace Normalizer ===');
transformerRegistry.setTransformer(new WhitespaceNormalizer());
// Designer will preserve original indentation style (tabs/spaces/width)

// Example 3: Comment Preservation
console.log('\n=== Example 3: Comment Preserver ===');
transformerRegistry.setTransformer(new CommentPreserver());
// Designer will attempt to restore inline comments from original source

// Example 4: Combined Transformations
console.log('\n=== Example 4: Composite Transformer ===');
const composite = new CompositeTransformer([
  new WhitespaceNormalizer(),
  new CommentPreserver()
]);
transformerRegistry.setTransformer(composite);
// First normalizes whitespace, then restores comments

// Example 5: Custom Transformer
console.log('\n=== Example 5: Custom Transformer ===');

import { SourceTransformer, TransformContext, TransformResult } from '../src/transformers';

class AddHeaderTransformer implements SourceTransformer {
  name = 'AddHeaderTransformer';

  transform(context: TransformContext): TransformResult {
    const header = `// File: ${context.filePath}\n// Last modified by designer\n\n`;

    if (context.candidateSource.startsWith('//')) {
      // Already has comments, don't add
      return {
        source: context.candidateSource,
        transformed: false
      };
    }

    return {
      source: header + context.candidateSource,
      transformed: true,
      warnings: ['Added header comment']
    };
  }
}

transformerRegistry.setTransformer(new AddHeaderTransformer());

// Example 6: Async Transformer (stub for future LLM integration)
console.log('\n=== Example 6: Async Transformer ===');

class PrettierTransformer implements SourceTransformer {
  name = 'PrettierTransformer';

  async transform(context: TransformContext): Promise<TransformResult> {
    try {
      // In real implementation, this would call prettier
      // const prettier = require('prettier');
      // const formatted = await prettier.format(context.candidateSource, {
      //   parser: 'typescript'
      // });

      // For now, just return as-is
      return {
        source: context.candidateSource,
        transformed: false,
        warnings: ['Prettier integration not yet implemented']
      };
    } catch (error: any) {
      return {
        source: context.candidateSource,
        transformed: false,
        warnings: [`Prettier failed: ${error.message}`]
      };
    }
  }
}

transformerRegistry.setTransformer(new PrettierTransformer());

console.log('\nTransformer examples configured!');
console.log('The active transformer will be used when saving files from the designer.');
