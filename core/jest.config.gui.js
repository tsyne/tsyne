module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest-environment-tsyne.js',
  // Force serial execution to prevent Fyne window conflicts
  // GUI tests can't run in parallel - they compete for display resources
  // Only test root-level test-apps (examples/ has its own package.json)
  maxWorkers: 1,
  roots: ['<rootDir>/test-apps'],
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
    '/examples/browser-bookmark-import-export.test.ts',
    '/examples/todomvc-designer.test.ts',
    '/examples/mouse-events-designer.test.ts',
    '/examples/calculator-designer.test.ts',
    '/designer/__tests__/e2e/designer.test.ts'
  ],
  collectCoverageFrom: [
    'test-apps/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true
};
