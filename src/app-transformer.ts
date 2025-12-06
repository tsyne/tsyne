/**
 * TypeScript AST Transformer for Sandbox Hardening
 *
 * This transformer rewrites dangerous identifiers in app source code
 * to use per-app random tokens, preventing sandbox escape.
 *
 * The "double round-trip" pattern: parse → transform → emit
 * produces canonical code that eliminates attack vectors.
 *
 * Transform table:
 * | Original        | Transformed                              | Runtime Behavior       |
 * |-----------------|------------------------------------------|------------------------|
 * | require(x)      | __tsyne_${token}_require__(x)            | Filtered require       |
 * | import(x)       | __tsyne_${token}_dynamicImport__(x)      | Filtered dynamic import|
 * | eval(x)         | __tsyne_${token}_eval__(x)               | Throws error           |
 * | Function(x)     | __tsyne_${token}_Function__(x)           | Throws error           |
 * | global          | __tsyne_${token}_global__                | Sandboxed object       |
 * | globalThis      | __tsyne_${token}_globalThis__            | Sandboxed object       |
 * | process         | __tsyne_${token}_process__               | Stub with safe subset  |
 */

import * as ts from 'typescript';
import * as crypto from 'crypto';

/**
 * Generate a cryptographically random token for this app instance
 */
export function generateAppToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Identifiers that need to be rewritten for sandboxing
 */
const DANGEROUS_IDENTIFIERS = new Set([
  'require',
  'eval',
  'Function',
  'global',
  'globalThis',
  'process',
]);

/**
 * Call expressions that need special handling (dynamic import)
 */
const DANGEROUS_CALLS = new Set([
  'import',  // dynamic import()
]);

/**
 * Create transformed identifier name
 */
function transformedName(original: string, token: string): string {
  return `__tsyne_${token}_${original}__`;
}

/**
 * Create a TypeScript transformer that rewrites dangerous identifiers
 */
export function createSandboxTransformer(token: string): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const visit = (node: ts.Node): ts.Node => {
      // Handle identifiers (variable references)
      if (ts.isIdentifier(node)) {
        const name = node.text;
        if (DANGEROUS_IDENTIFIERS.has(name)) {
          // Check if this is a declaration (we don't want to rename those)
          const parent = node.parent;
          if (parent && (
            ts.isVariableDeclaration(parent) && parent.name === node ||
            ts.isFunctionDeclaration(parent) && parent.name === node ||
            ts.isParameter(parent) && parent.name === node ||
            ts.isPropertyDeclaration(parent) && parent.name === node ||
            ts.isMethodDeclaration(parent) && parent.name === node ||
            ts.isPropertyAssignment(parent) && parent.name === node ||
            ts.isPropertySignature(parent) && parent.name === node ||
            ts.isBindingElement(parent) && parent.name === node
          )) {
            // This is a declaration, don't transform
            return node;
          }
          // This is a reference, transform it
          return ts.factory.createIdentifier(transformedName(name, token));
        }
      }

      // Handle call expressions for dynamic import
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        // Dynamic import: import('...')
        if (expression.kind === ts.SyntaxKind.ImportKeyword) {
          // Transform to __tsyne_${token}_dynamicImport__(...)
          return ts.factory.createCallExpression(
            ts.factory.createIdentifier(transformedName('dynamicImport', token)),
            node.typeArguments,
            node.arguments
          );
        }
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (sourceFile: ts.SourceFile) => {
      return ts.visitNode(sourceFile, visit) as ts.SourceFile;
    };
  };
}

/**
 * Transform TypeScript source code for sandboxed execution
 *
 * @param source - Original TypeScript source code
 * @param token - Per-app random token
 * @param filename - Optional filename for error messages
 * @returns Transformed JavaScript code
 */
export function transformAppSource(
  source: string,
  token: string,
  filename: string = 'app.ts'
): string {
  // Parse the source
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS
  );

  // Transform with our sandbox transformer
  const result = ts.transform(sourceFile, [createSandboxTransformer(token)]);
  const transformedSourceFile = result.transformed[0];

  // Emit to JavaScript
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const transformedCode = printer.printFile(transformedSourceFile);
  result.dispose();

  return transformedCode;
}

/**
 * Generate the sandboxed runtime that provides safe implementations
 * of the transformed identifiers.
 *
 * This code is injected into the app's execution context.
 */
export function generateSandboxedRuntime(token: string, allowedModules: string[]): string {
  const allowedSet = JSON.stringify(allowedModules);

  return `
// Sandboxed runtime for app with token ${token}
// This provides safe implementations of dangerous APIs

const ${transformedName('require', token)} = (function() {
  const allowedModules = new Set(${allowedSet});
  const originalRequire = typeof require !== 'undefined' ? require : null;

  return function(moduleName) {
    // Allow tsyne imports
    if (moduleName.startsWith('tsyne') || moduleName.startsWith('./') || moduleName.startsWith('../')) {
      if (originalRequire) return originalRequire(moduleName);
      throw new Error('require not available');
    }

    // Allow explicitly permitted modules
    if (allowedModules.has(moduleName)) {
      if (originalRequire) return originalRequire(moduleName);
      throw new Error('require not available');
    }

    throw new Error(\`Module '\${moduleName}' is not allowed in sandboxed apps\`);
  };
})();

const ${transformedName('dynamicImport', token)} = async function(moduleName) {
  throw new Error('Dynamic import() is not allowed in sandboxed apps');
};

const ${transformedName('eval', token)} = function(code) {
  throw new Error('eval() is not allowed in sandboxed apps');
};

const ${transformedName('Function', token)} = function(...args) {
  throw new Error('Function() constructor is not allowed in sandboxed apps');
};

const ${transformedName('global', token)} = Object.freeze({
  // Provide safe subset of global
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Promise: Promise,
  JSON: JSON,
  Math: Math,
  Date: Date,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Map: Map,
  Set: Set,
  WeakMap: WeakMap,
  WeakSet: WeakSet,
  Symbol: Symbol,
  Error: Error,
  TypeError: TypeError,
  RangeError: RangeError,
  // Explicitly NOT including: process, require, eval, Function, Buffer, etc.
});

const ${transformedName('globalThis', token)} = ${transformedName('global', token)};

const ${transformedName('process', token)} = Object.freeze({
  // Safe subset of process
  env: Object.freeze({}),  // Empty - no access to real env vars
  platform: 'sandboxed',
  version: 'v0.0.0',
  versions: Object.freeze({}),
  // Explicitly NOT including: exit, kill, env (real), stdin, stdout, stderr, etc.
});

`;
}

/**
 * Full transformation pipeline for an app
 *
 * @param source - Original TypeScript source code
 * @param appName - App name for logging
 * @param allowedModules - List of npm modules the app is allowed to require
 * @returns Object containing token and transformed code
 */
export function transformApp(
  source: string,
  appName: string,
  allowedModules: string[] = []
): { token: string; code: string } {
  const token = generateAppToken();

  // Transform the source
  const transformedCode = transformAppSource(source, token, `${appName}.ts`);

  // Generate runtime
  const runtime = generateSandboxedRuntime(token, allowedModules);

  // Combine runtime + transformed code
  const fullCode = runtime + '\n' + transformedCode;

  return { token, code: fullCode };
}

/**
 * Check if source code contains any potentially dangerous patterns
 * that weren't caught by the transformer.
 *
 * This is a defense-in-depth check.
 */
export function auditTransformedCode(code: string, token: string): string[] {
  const warnings: string[] = [];

  // Check for any remaining dangerous identifiers not prefixed with our token
  for (const dangerous of DANGEROUS_IDENTIFIERS) {
    // Look for the identifier not preceded by our prefix
    const regex = new RegExp(`(?<!__tsyne_${token}_)\\b${dangerous}\\b(?!__)`, 'g');
    const matches = code.match(regex);
    if (matches) {
      // Filter out string literals and comments (rough check)
      const nonStringMatches = matches.filter((_, index) => {
        // This is a simplified check - a real implementation would use AST
        return true;
      });
      if (nonStringMatches.length > 0) {
        warnings.push(`Found ${nonStringMatches.length} instances of '${dangerous}' that may not be transformed`);
      }
    }
  }

  // Check for dynamic import keyword
  if (code.includes('import(') && !code.includes(transformedName('dynamicImport', token))) {
    warnings.push('Found dynamic import() that may not be transformed');
  }

  return warnings;
}
