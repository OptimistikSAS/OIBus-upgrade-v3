export default {
  rootDir: '../',
  coverageDirectory: './tests/coverage',
  transform: { '^.+\\.(ts|js)?$': 'ts-jest' },
  testEnvironment: 'node',
  testRegex: '.*\\.(test|spec)?\\.(ts|tsx)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  modulePathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/']
};
