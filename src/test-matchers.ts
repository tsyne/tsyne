/**
 * Custom Jest matchers for Tsyne testing
 *
 * These matchers override Jest's built-in matchers with versions that use
 * INTERNAL_MATCHER_FLAG to ensure Jest's error reporting points to the test
 * file that called the matcher, not to the matcher implementation.
 *
 * Our implementations handle the same types as Jest's built-ins (strings,
 * arrays, Sets, Maps, iterables) so they work as drop-in replacements.
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

// Helper to check if value is iterable (but not string)
function isIterable(value: unknown): value is Iterable<unknown> {
  return value != null && typeof (value as any)[Symbol.iterator] === 'function' && typeof value !== 'string';
}

// toBe - overrides Jest's toBe for equality checks
const toBe = function(this: MatcherContext, received: unknown, expected: unknown): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received === expected;

  const message = pass
    ? () =>
        matcherHint('.not.toBe', 'received', 'expected') +
        '\n\n' +
        `Expected value not to equal:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toBe', 'received', 'expected') +
        '\n\n' +
        `Expected:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBe);

// toContain - overrides Jest's toContain for substring/array/Set/iterable checks
const toContain = function(this: MatcherContext, received: unknown, expected: unknown): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;

  let pass = false;
  let itemType = 'item';

  if (typeof received === 'string') {
    // String substring check
    pass = typeof expected === 'string' && received.includes(expected);
    itemType = 'substring';
  } else if (Array.isArray(received)) {
    // Array element check
    pass = received.includes(expected);
    itemType = 'item';
  } else if (received instanceof Set) {
    // Set membership check
    pass = received.has(expected);
    itemType = 'item';
  } else if (received instanceof Map) {
    // Map value check
    pass = Array.from(received.values()).includes(expected);
    itemType = 'value';
  } else if (isIterable(received)) {
    // Generic iterable check
    for (const item of received) {
      if (item === expected) {
        pass = true;
        break;
      }
    }
    itemType = 'item';
  }

  const message = pass
    ? () =>
        matcherHint('.not.toContain', 'received', 'expected') +
        '\n\n' +
        `Expected not to contain ${itemType}:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toContain', 'received', 'expected') +
        '\n\n' +
        `Expected to contain ${itemType}:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toContain);

// toMatch - overrides Jest's toMatch for regex pattern checks
const toMatch = function(this: MatcherContext, received: string, expected: RegExp): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = typeof received === 'string' && expected.test(received);

  const message = pass
    ? () =>
        matcherHint('.not.toMatch', 'received', 'expected') +
        '\n\n' +
        `Expected string not to match pattern:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toMatch', 'received', 'expected') +
        '\n\n' +
        `Expected string to match pattern:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toMatch);

// toBeTruthy - overrides Jest's toBeTruthy for truthy checks
const toBeTruthy = function(this: MatcherContext, received: unknown): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const pass = !!received;

  const message = pass
    ? () =>
        matcherHint('.not.toBeTruthy', 'received', '') +
        '\n\n' +
        `Expected value to be falsy\n` +
        `Received: ${printReceived(received)}`
    : () =>
        matcherHint('.toBeTruthy', 'received', '') +
        '\n\n' +
        `Expected value to be truthy\n` +
        `Received: ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBeTruthy);

// toBeFalsy - overrides Jest's toBeFalsy for falsy checks
const toBeFalsy = function(this: MatcherContext, received: unknown): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const pass = !received;

  const message = pass
    ? () =>
        matcherHint('.not.toBeFalsy', 'received', '') +
        '\n\n' +
        `Expected value to be truthy\n` +
        `Received: ${printReceived(received)}`
    : () =>
        matcherHint('.toBeFalsy', 'received', '') +
        '\n\n' +
        `Expected value to be falsy\n` +
        `Received: ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBeFalsy);

// toBeGreaterThan - overrides Jest's toBeGreaterThan
const toBeGreaterThan = function(this: MatcherContext, received: number, expected: number): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received > expected;

  const message = pass
    ? () =>
        matcherHint('.not.toBeGreaterThan', 'received', 'expected') +
        '\n\n' +
        `Expected value not to be greater than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toBeGreaterThan', 'received', 'expected') +
        '\n\n' +
        `Expected value to be greater than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBeGreaterThan);

// toBeLessThan - overrides Jest's toBeLessThan
const toBeLessThan = function(this: MatcherContext, received: number, expected: number): MatcherResult {
  const { matcherHint, printExpected, printReceived } = this.utils;
  const pass = received < expected;

  const message = pass
    ? () =>
        matcherHint('.not.toBeLessThan', 'received', 'expected') +
        '\n\n' +
        `Expected value not to be less than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`
    : () =>
        matcherHint('.toBeLessThan', 'received', 'expected') +
        '\n\n' +
        `Expected value to be less than:\n` +
        `  ${printExpected(expected)}\n` +
        `Received:\n` +
        `  ${printReceived(received)}`;

  return { pass, message };
};
markAsInternalMatcher(toBeLessThan);

// toBeChecked - custom matcher for checkbox state
const toBeChecked = function(this: MatcherContext, received: boolean | undefined, expected: boolean): MatcherResult {
  const { matcherHint } = this.utils;
  const pass = received === expected;

  const expectedText = expected ? 'checked' : 'unchecked';
  const receivedText = received ? 'checked' : 'unchecked';

  const message = pass
    ? () =>
        matcherHint('.not.toBeChecked', 'received', '') +
        '\n\n' +
        `Expected checkbox not to be ${expectedText}\n` +
        `Received: ${receivedText}`
    : () =>
        matcherHint('.toBeChecked', 'received', '') +
        '\n\n' +
        `Expected checkbox to be ${expectedText}\n` +
        `Received: ${receivedText}`;

  return { pass, message };
};
markAsInternalMatcher(toBeChecked);

// toBeEnabled - custom matcher for enabled/disabled state
const toBeEnabled = function(this: MatcherContext, disabled: boolean | undefined, expectedEnabled: boolean): MatcherResult {
  const { matcherHint } = this.utils;
  const actualEnabled = disabled === false || disabled === undefined;
  const pass = actualEnabled === expectedEnabled;

  const expectedText = expectedEnabled ? 'enabled' : 'disabled';
  const receivedText = actualEnabled ? 'enabled' : 'disabled';

  const message = pass
    ? () =>
        matcherHint('.not.toBeEnabled', 'received', '') +
        '\n\n' +
        `Expected widget not to be ${expectedText}\n` +
        `Received: ${receivedText}`
    : () =>
        matcherHint('.toBeEnabled', 'received', '') +
        '\n\n' +
        `Expected widget to be ${expectedText}\n` +
        `Received: ${receivedText}`;

  return { pass, message };
};
markAsInternalMatcher(toBeEnabled);

// toExist - custom matcher for widget existence checks
const toExist = function(this: MatcherContext, received: unknown, expectedToExist: boolean): MatcherResult {
  const { matcherHint, printReceived } = this.utils;
  const actuallyExists = received !== null && received !== undefined;
  const pass = actuallyExists === expectedToExist;

  const message = pass
    ? () =>
        matcherHint(expectedToExist ? '.not.toExist' : '.toExist', 'widget', '') +
        '\n\n' +
        (expectedToExist
          ? `Expected widget not to exist\nReceived: ${printReceived(received)}`
          : `Expected widget to exist\nReceived: not found`)
    : () =>
        matcherHint(expectedToExist ? '.toExist' : '.not.toExist', 'widget', '') +
        '\n\n' +
        (expectedToExist
          ? `Expected widget to exist\nReceived: not found`
          : `Expected widget not to exist\nReceived: ${printReceived(received)}`);

  return { pass, message };
};
markAsInternalMatcher(toExist);

// Export matchers for registration
export const tsyneMatchers = {
  toBe,
  toContain,
  toMatch,
  toBeTruthy,
  toBeFalsy,
  toBeGreaterThan,
  toBeLessThan,
  toBeChecked,
  toBeEnabled,
  toExist,
};

/**
 * Initialize Tsyne test matchers - call this before running tests
 * This overrides Jest's built-in matchers with versions that have proper stack traces
 */
export function initTsyneMatchers(): void {
  // Get Jest's expect function
  const jestExpect = (globalThis as any).expect;
  if (jestExpect && typeof jestExpect.extend === 'function') {
    jestExpect.extend(tsyneMatchers);
  }
}
