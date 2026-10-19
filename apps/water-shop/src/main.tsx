import { installDomGuard } from './lib/domGuard';
installDomGuard();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { installCrashOverlay } from './lib/crash';

installCrashOverlay();

registerSW({
  immediate: true,
  // Check for a new deploy whenever the app is opened/refocused, so a phone never
  // keeps running an old cached version for long.
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => { if (navigator.onLine) void reg.update().catch(() => {}); };
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
    setInterval(check, 5 * 60_000);
  },
});

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
