/** @type {import('ts-jest').JestConfigWithTsJest} */
const base = require('../../trine/jest.config');

module.exports = {
  ...base,
  roots: ['<rootDir>'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
