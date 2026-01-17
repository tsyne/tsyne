module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['grand-perspective.ts'],
  testTimeout: 30000,
};
