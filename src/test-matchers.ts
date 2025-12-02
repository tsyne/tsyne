/**
 * Custom Jest matchers for Tsyne testing
 *
 * These matchers use the INTERNAL_MATCHER_FLAG to ensure Jest's error reporting
 * points to the test file that called the matcher, not to the matcher implementation.
 */

const INTERNAL_MATCHER_FLAG = Symbol.for('$$jest-internal-matcher');

interface MatcherUtils {
  matcherHint: (name: string, received?: string, expected?: string) => string;
  printExpected: (value: unknown) => string;
  printReceived: (value: unknown) => string;
}

interface MatcherContext {
  utils: MatcherUtils;
  isNot: boolean;
}

// Type for matcher result
interface MatcherResult {
  pass: boolean;
  message: () => string;
}

// Helper to mark function as internal matcher
function markAsInternalMatcher(fn: Function): void {
  Object.defineProperty(fn, INTERNAL_MATCHER_FLAG, {
    value: true,
    configurable: true,
  });
}

// toBeTsyneEqual - for string equality checks
const toBeTsyneEqual = function(this: MatcherContext, received: unknown, expected: unknown): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received === expected;

  const message = pass
    ? () =>
        matcherHint('.not.toBeTsyneEqual', 'received', 'expected') +
        '\n\n' +
        `Expected value not to equal:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toBeTsyneEqual', 'received', 'expected') +
        '\n\n' +
        `Expected:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBeTsyneEqual);

// toContainTsyneString - for substring checks
const toContainTsyneString = function(this: MatcherContext, received: string, expected: string): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = typeof received === 'string' && received.includes(expected);

  const message = pass
    ? () =>
        matcherHint('.not.toContainTsyneString', 'received', 'expected') +
        '\n\n' +
        `Expected string not to contain:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toContainTsyneString', 'received', 'expected') +
        '\n\n' +
        `Expected string to contain:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toContainTsyneString);

// toMatchTsynePattern - for regex pattern checks
const toMatchTsynePattern = function(this: MatcherContext, received: string, expected: RegExp): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = typeof received === 'string' && expected.test(received);

  const message = pass
    ? () =>
        matcherHint('.not.toMatchTsynePattern', 'received', 'expected') +
        '\n\n' +
        `Expected string not to match pattern:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toMatchTsynePattern', 'received', 'expected') +
        '\n\n' +
        `Expected string to match pattern:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toMatchTsynePattern);

// toBeTsyneChecked - for boolean checked state
const toBeTsyneChecked = function(this: MatcherContext, received: boolean | undefined, expected: boolean): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received === expected;

  const expectedText = expected ? 'checked' : 'unchecked';
  const receivedText = received ? 'checked' : 'unchecked';

  const message = pass
    ? () =>
        matcherHint('.not.toBeTsyneChecked', 'received', '') +
        '\n\n' +
        `Expected checkbox not to be ${expectedText}\n` +
        `Received: ${receivedText}`
    : () =>
        matcherHint('.toBeTsyneChecked', 'received', '') +
        '\n\n' +
        `Expected checkbox to be ${expectedText}\n` +
        `Received: ${receivedText}`;

  return { pass, message };
};
markAsInternalMatcher(toBeTsyneChecked);

// toBeTsyneEnabled - for enabled/disabled state
const toBeTsyneEnabled = function(this: MatcherContext, disabled: boolean | undefined, expectedEnabled: boolean): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const actualEnabled = disabled === false || disabled === undefined;
  const pass = actualEnabled === expectedEnabled;

  const expectedText = expectedEnabled ? 'enabled' : 'disabled';
  const receivedText = actualEnabled ? 'enabled' : 'disabled';

  const message = pass
    ? () =>
        matcherHint('.not.toBeTsyneEnabled', 'received', '') +
        '\n\n' +
        `Expected widget not to be ${expectedText}\n` +
        `Received: ${receivedText}`
    : () =>
        matcherHint('.toBeTsyneEnabled', 'received', '') +
        '\n\n' +
        `Expected widget to be ${expectedText}\n` +
        `Received: ${receivedText}`;

  return { pass, message };
};
markAsInternalMatcher(toBeTsyneEnabled);

// toBeTsyneVisible - for visibility checks
const toBeTsyneVisible = function(this: MatcherContext, received: unknown, expectedVisible: boolean): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const actualVisible = received !== null && received !== undefined;
  const pass = actualVisible === expectedVisible;

  const message = pass
    ? () =>
        matcherHint(expectedVisible ? '.not.toBeTsyneVisible' : '.toBeTsyneVisible', 'widget', '') +
        '\n\n' +
        (expectedVisible
          ? `Expected widget not to be visible\nReceived: ${printReceived(received)}`
          : `Expected widget to be visible\nReceived: not found`)
    : () =>
        matcherHint(expectedVisible ? '.toBeTsyneVisible' : '.not.toBeTsyneVisible', 'widget', '') +
        '\n\n' +
        (expectedVisible
          ? `Expected widget to be visible\nReceived: not found`
          : `Expected widget not to be visible\nReceived: ${printReceived(received)}`);

  return { pass, message };
};
markAsInternalMatcher(toBeTsyneVisible);

// toBeTsyneTrue - for boolean true assertions
const toBeTsyneTrue = function(this: MatcherContext, received: boolean): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const pass = received === true;

  const message = pass
    ? () =>
        matcherHint('.not.toBeTsyneTrue', 'received', '') +
        '\n\n' +
        `Expected value not to be true\n` +
        `Received: ${printReceived(received)}`
    : () =>
        matcherHint('.toBeTsyneTrue', 'received', '') +
        '\n\n' +
        `Expected value to be true\n` +
        `Received: ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBeTsyneTrue);

// toHaveTsyneCount - for exact widget count checks
const toHaveTsyneCount = function(this: MatcherContext, received: number, expected: number): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received === expected;

  const message = pass
    ? () =>
        matcherHint('.not.toHaveTsyneCount', 'received', 'expected') +
        '\n\n' +
        `Expected widget count not to be:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toHaveTsyneCount', 'received', 'expected') +
        '\n\n' +
        `Expected widget count:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toHaveTsyneCount);

// toHaveTsyneCountGreaterThan - for widget count greater than checks
const toHaveTsyneCountGreaterThan = function(this: MatcherContext, received: number, expected: number): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received > expected;

  const message = pass
    ? () =>
        matcherHint('.not.toHaveTsyneCountGreaterThan', 'received', 'expected') +
        '\n\n' +
        `Expected widget count not to be greater than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toHaveTsyneCountGreaterThan', 'received', 'expected') +
        '\n\n' +
        `Expected widget count to be greater than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toHaveTsyneCountGreaterThan);

// toHaveTsyneCountLessThan - for widget count less than checks
const toHaveTsyneCountLessThan = function(this: MatcherContext, received: number, expected: number): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received < expected;

  const message = pass
    ? () =>
        matcherHint('.not.toHaveTsyneCountLessThan', 'received', 'expected') +
        '\n\n' +
        `Expected widget count not to be less than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toHaveTsyneCountLessThan', 'received', 'expected') +
        '\n\n' +
        `Expected widget count to be less than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toHaveTsyneCountLessThan);

// Export matchers for registration
export const tsyneMatchers = {
  toBeTsyneEqual,
  toContainTsyneString,
  toMatchTsynePattern,
  toBeTsyneChecked,
  toBeTsyneEnabled,
  toBeTsyneVisible,
  toBeTsyneTrue,
  toHaveTsyneCount,
  toHaveTsyneCountGreaterThan,
  toHaveTsyneCountLessThan,
};

// Type declarations for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTsyneEqual(expected: unknown): R;
      toContainTsyneString(expected: string): R;
      toMatchTsynePattern(expected: RegExp): R;
      toBeTsyneChecked(expected: boolean): R;
      toBeTsyneEnabled(expectedEnabled: boolean): R;
      toBeTsyneVisible(expectedVisible: boolean): R;
      toBeTsyneTrue(): R;
      toHaveTsyneCount(expected: number): R;
      toHaveTsyneCountGreaterThan(expected: number): R;
      toHaveTsyneCountLessThan(expected: number): R;
    }
  }
}

/**
 * Initialize Tsyne test matchers - call this before running tests
 */
export function initTsyneMatchers(): void {
  // Get Jest's expect function
  const jestExpect = (globalThis as any).expect;
  if (jestExpect && typeof jestExpect.extend === 'function') {
    jestExpect.extend(tsyneMatchers);
  }
}
