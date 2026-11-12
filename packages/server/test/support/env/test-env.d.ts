/**
 * Environment the E2E app boots with. It must be applied before `AppModule`
 * (and therefore `app.config.ts`) is imported: the config module validates the
 * whole environment once, at import time.
 */
export declare const TEST_AUTH_ORIGIN = "http://app.depose.test";
export declare const TEST_AUTH_SECRET = "depose-e2e-secret-0123456789abcdef0123456789";
export declare const TEST_SECRET_KEY = "depose-e2e-ai-secret-key-0123456789abcdef";
export interface TestEnvOverrides {
    [key: string]: string | undefined;
}
export declare function applyTestEnv(overrides?: TestEnvOverrides): void;
//# sourceMappingURL=test-env.d.ts.map