import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@xterm/xterm/css/xterm.css';
import '@fontsource-variable/inter';
import './styles.css';
import './mobile.css';
import App from './app';
import { applyStoredPiGuiTheme } from './app/app-shell/usePiGuiTheme';
import { queryClient } from './app/query/query-client';

// Signal that howcode is loaded
window.howcodeLoaded = true;

// Mobile: disable desktop bridge checks
if (import.meta.env.PROD) {
  Object.defineProperty(window, 'desktopBridge', {
    get: () => ({ available: true, isDesktop: () => false }),
    configurable: true
  });
}

try {
  applyStoredPiGuiTheme();
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
} catch (error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<pre class="bootstrap-error">Bootstrap error:\n${String(error)}</pre>`;
  }
  throw error;
}
