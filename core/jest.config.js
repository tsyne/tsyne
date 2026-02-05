module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest-environment-tsyne.js',
  // Transform three.js ES modules
  transformIgnorePatterns: [
    '/node_modules/(?!three)/'
  ],
  // Force serial execution to prevent Fyne window conflicts
  // GUI tests can't run in parallel - they compete for display resources
  maxWorkers: 1,
  // Only look for tests within core/ - don't pick up sibling directories
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/?(*.)+(spec|test).ts',
    '<rootDir>/test/**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/test.ts',
    '/src/tsyne-test.ts',
    '/src/tsyne-browser-test.ts'
  ],
  collectCoverageFrom: [
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
    // Transform three.js ES modules using babel
    '[\\\\/]three[\\\\/]src[\\\\/].+\\.js$': 'babel-jest',
    '^.+\\.ts$': ['ts-jest', {
      // Disable type checking - runtime errors will still be caught
      diagnostics: false,
      isolatedModules: true
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true
};
