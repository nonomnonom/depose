import React from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from '@depose/ui/components/button';
import '@depose/ui/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Button>Hello from @depose/ui</Button>
  </React.StrictMode>,
);
