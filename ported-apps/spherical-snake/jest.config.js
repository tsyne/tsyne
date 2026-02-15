module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
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
