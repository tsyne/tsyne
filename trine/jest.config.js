/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../ported-apps'],
  testMatch: ['**/*.test.ts'],
  transform: {
    // Transform three.js ES modules (src and examples/jsm) using babel
    '[\\\\/]three[\\\\/](src|examples[\\\\/]jsm)[\\\\/].+\\.js$': 'babel-jest',
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!three)/',
  ],
  moduleNameMapper: {
    '^three/examples/jsm/(.*)$': '<rootDir>/../three/examples/jsm/$1',
    '^three$': '<rootDir>/../three/build/three.cjs',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
};
