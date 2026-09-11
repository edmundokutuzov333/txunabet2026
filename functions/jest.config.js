/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Force module imports to be resolved with the .js extension
    // This is required for ES Modules support in Jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
