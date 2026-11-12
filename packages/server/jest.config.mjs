/** Jest runs the critical E2E paths only. Legacy node:test specs stay out. */
const config = {
  rootDir: '.',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: [
    '<rootDir>/test/auth.e2e.spec.ts',
    '<rootDir>/test/tenancy.e2e.spec.ts',
    '<rootDir>/test/ingest.e2e.spec.ts',
    '<rootDir>/test/ai.e2e.spec.ts',
    '<rootDir>/test/inconsistencies.e2e.spec.ts',
    '<rootDir>/test/jobs.e2e.spec.ts',
    '<rootDir>/test/production-hardening.e2e.spec.ts',
    '<rootDir>/test/workflow.e2e.spec.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
        module: { type: 'es6' },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 30_000,
  maxWorkers: 1,
  clearMocks: true,
  restoreMocks: true,
};

export default config;
