import { createRoot } from 'react-dom/client';

import { App } from '~/features/App';
import logoUrl from '~/assets/mascot/logo-favicon.png';
import '~/styles/globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/png';
favicon.href = logoUrl;
document.head.appendChild(favicon);

createRoot(container).render(<App />);
