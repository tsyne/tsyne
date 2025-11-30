module.exports = {
  preset: 'ts-jest',
  testEnvironment: '../../jest-environment-tsyne.js',
  roots: ['<rootDir>'],
  testMatch: [
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/screenshots/',
    'logic[.-]test\\.ts$'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  moduleNameMapper: {
    'node-pty': '<rootDir>/__mocks__/node-pty.js'
  }
};
