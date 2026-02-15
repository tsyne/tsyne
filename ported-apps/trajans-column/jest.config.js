module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }]
  },
  moduleNameMapper: {
    '^cosyne$': '<rootDir>/../../cosyne/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true
};
