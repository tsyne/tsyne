module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['*.ts', '!*.test.ts', '!node_modules'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
