module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^tsyne$': '<rootDir>/../../core/src/index.ts',
    '^tsyne/(.*)$': '<rootDir>/../../core/$1',
  },
};
