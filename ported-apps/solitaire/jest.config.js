module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  maxWorkers: 1, // Run tests sequentially to avoid bridge process conflicts
  testMatch: [
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
