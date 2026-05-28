import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { ErrorBoundary } from './ErrorBoundary';

const rootEl = document.getElementById('root');

const setBootError = (message: string) => {
  window.__APP_BOOT_ERROR__ = message;
  console.error(message);
};

window.addEventListener('error', (event) => {
  if (!window.__APP_BOOT_ERROR__) {
    setBootError(`Error: ${event.message}`);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (!window.__APP_BOOT_ERROR__) {
    const reason = typeof event.reason === 'string' ? event.reason : JSON.stringify(event.reason);
    setBootError(`UnhandledRejection: ${reason}`);
  }
});

try {
  if (!rootEl) {
    throw new Error('root element not found');
  }
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  window.__APP_BOOT_OK__ = true;
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  setBootError(`BootError: ${msg}`);
}
