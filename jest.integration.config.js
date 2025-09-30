/**
 * Jest Configuration for Integration Tests
 */

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage-integration',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/instrumentation.js',
  ],
  testMatch: [
    '**/tests/integration/**/*.test.js',
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};