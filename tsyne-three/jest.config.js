/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    // Transform three.js ES modules using babel
    '[\\\\/]three[\\\\/]src[\\\\/].+\\.js$': 'babel-jest',
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!three)/',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
};
