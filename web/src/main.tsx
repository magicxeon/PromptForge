import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { initializeI18n } from './lib/i18n/i18n';
import { bootstrapDocumentTheme } from './lib/theme/themeDocument';
import '@fontsource/poppins/500.css';
import '@fontsource/noto-sans-thai/500.css';
import './styles/globals.css';

bootstrapDocumentTheme();
await initializeI18n();

const root = document.getElementById('root');

if (!root) {
  throw new Error('React root element is unavailable.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
