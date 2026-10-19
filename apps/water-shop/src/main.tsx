import { installDomGuard } from './lib/domGuard';
installDomGuard();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { installCrashOverlay } from './lib/crash';

installCrashOverlay();

registerSW({ immediate: true });

// If a newer deploy replaced a script file this page still needs, reload once
// to pick up the new version instead of leaving a broken screen.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('wsm-reloaded')) return;
  sessionStorage.setItem('wsm-reloaded', '1');
  location.reload();
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('wsm-reloaded'), 10_000));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
