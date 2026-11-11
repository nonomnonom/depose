import { defineConfig } from 'orval';

export default defineConfig({
  depose: {
    input: {
      target: '../server/openapi.json',
    },
    output: {
      target: './src/generated/endpoints.ts',
      schemas: './src/generated/schemas',
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
