module.exports = {
  preset: 'ts-jest',
  testEnvironment: '../jest-environment-tsyne.js',
  roots: ['<rootDir>'],
  testMatch: [
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/screenshots/',
    '/pages/',
    '/assets/',
    'logic[.-]test\\.ts$',
    'browser.test.ts',
    'fluent-api.test.ts',
    'fluent-properties.test.ts',
    'browser-enter-key.test.ts',
    'entry-submit.test.ts',
    'home-button.test.ts',
    'browser-home.test.ts',
    'window-title.test.ts',
    'browser-page-title.test.ts',
    'status-bar.test.ts',
    'browser-status-bar.test.ts',
    'browser-page-cache.test.ts',
    'browser-history-persistence.test.ts',
    'browser-url-validation.test.ts',
    'browser-clear-history.test.ts',
    'browser-bookmarks.test.ts',
    'browser-find.test.ts',
    'browser-history-ui.test.ts',
    'browser-bookmark-import-export.test.ts',
    'todomvc-designer.test.ts',
    'mouse-events-designer.test.ts',
    'calculator-designer.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true
};
