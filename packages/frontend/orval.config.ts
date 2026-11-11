import { defineConfig } from 'orval';

export default defineConfig({
  depose: {
    input: {
      target: '../server/openapi.json',
    },
    output: {
      target: './src/lib/api/generated/endpoints.ts',
      schemas: './src/lib/api/generated/schemas',
      client: 'fetch',
      mode: 'single',
      clean: true,
      override: {
        mutator: {
          path: './src/lib/api/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
