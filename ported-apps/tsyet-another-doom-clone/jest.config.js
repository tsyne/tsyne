module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/index.test.ts'],  // Only run unit tests, not tsyne integration tests
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        strict: false,
        noImplicitAny: false,
        isolatedModules: true,  // Skip type checking for faster tests
      },
    }],
  },
};
