module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Note: Some tests (especially todomvc.test.ts and todomvc-ngshow.test.ts) can be flaky
  // when run in parallel. If you encounter flakiness, run with --runInBand flag.
  roots: ['<rootDir>/test-apps', '<rootDir>/src', '<rootDir>/examples'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/test.ts',
    '/src/tsyne-test.ts',
    '/src/tsyne-browser-test.ts',
    '/examples/browser.test.ts',
    '/examples/fluent-api.test.ts',
    '/examples/fluent-properties.test.ts',
    '/examples/browser-enter-key.test.ts',
    '/examples/entry-submit.test.ts',
    '/examples/home-button.test.ts',
    '/examples/browser-home.test.ts',
    '/examples/window-title.test.ts',
    '/examples/browser-page-title.test.ts',
    '/examples/status-bar.test.ts',
    '/examples/browser-status-bar.test.ts',
    '/examples/browser-page-cache.test.ts',
    '/examples/browser-history-persistence.test.ts',
    '/examples/browser-url-validation.test.ts',
    '/examples/browser-clear-history.test.ts',
    '/examples/browser-bookmarks.test.ts',
    '/examples/browser-find.test.ts',
    '/examples/browser-history-ui.test.ts',
    '/examples/browser-bookmark-import-export.test.ts'
  ],
  collectCoverageFrom: [
    'test-apps/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true
};
