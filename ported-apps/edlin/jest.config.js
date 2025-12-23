// GUI/integration tests configuration (requires Tsyne bridge)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: '../../jest-environment-tsyne.js',
  testMatch: [
    '**/edlin.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
