import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '~/lib/query/client';
import { SceneApp } from '~/app/sceneRoutes';

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SceneApp />
      </QueryClientProvider>
    </StrictMode>
  );
}

export default App;
