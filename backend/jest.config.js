module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Integration test suites (routes.test.ts, passport.integration.test.ts, users.test.ts)
  // share one Postgres test database and truncate its tables in beforeEach. Jest's default
  // parallel workers run suites concurrently, so those truncates/writes race across suites
  // and produce flaky failures. Run test files serially to keep the shared DB consistent.
  maxWorkers: 1,
  // The build step compiles src/ into dist/, including test files. Without this,
  // jest's default testMatch picks up those compiled dist/**/*.test.js files too,
  // running every integration suite twice.
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
