module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1, // Run tests sequentially to avoid bridge process conflicts
  testMatch: [
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: false }]
  },
  moduleNameMapper: {
    '^cosyne$': '<rootDir>/../../cosyne/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
