import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PublicExhibitionPage } from './ui/PublicExhibitionPage';
import './styles.css';

// Two entry surfaces, one bundle: /e/:slug is the anonymous shared-link
// viewer; everything else is the signed-in application. A router library
// arrives when there is a third route, not before.
const publicSlug = window.location.pathname.match(/^\/e\/([A-Za-z0-9-]+)\/?$/)?.[1];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicSlug ? <PublicExhibitionPage slug={publicSlug} /> : <App />}
  </StrictMode>,
);
