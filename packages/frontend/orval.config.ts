import { defineConfig } from 'orval';

export default defineConfig({
  src: [
    {
      id: 'depose-api',
      input: 'http://localhost:3000/api/docs-json',
      output: 'src/generated/depose-api',
      mode: 'react-query',
      client: 'fetch',
      formDataFormat: false,
      cleanOutput: true,
      override: {
        mutator: {
          path: './src/lib/api-mutator.ts',
          name: 'customFetch',
        },
        requestOptions: {
          credentials: 'include',
        },
      },
      Zod: true,
      headers: {
        Accept: 'application/json',
      },
    },
  ],
});
