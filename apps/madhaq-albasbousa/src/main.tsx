import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The build pre-renders the page into #root (fast first paint + SEO); hydrate it when it's there.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
