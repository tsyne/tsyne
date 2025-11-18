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
  CompositeTransformer,
  ESLintTransformer
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

// Example 7: ESLint Transformer - Automatic linting on save
console.log('\n=== Example 7: ESLint Transformer ===');
transformerRegistry.setTransformer(new ESLintTransformer());
// Designer will automatically lint and fix code style issues on save
// Uses the .eslintrc.json configuration in the designer directory

// Example 8: Production Setup - Combined Transformers with ESLint
console.log('\n=== Example 8: Production Setup ===');
const productionTransformer = new CompositeTransformer([
  new WhitespaceNormalizer(),
  new CommentPreserver(),
  new ESLintTransformer()
]);
transformerRegistry.setTransformer(productionTransformer);
// 1. Normalizes whitespace to match original
// 2. Attempts to restore comments
// 3. Runs ESLint to fix style issues

console.log('\nTransformer examples configured!');
console.log('The active transformer will be used when saving files from the designer.');
