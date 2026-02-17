import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v9
// Prevent Vite error overlay frame access errors
// Force update to clear Vite cache

// Block error overlay registration before it tries to access frame
const originalDefine = customElements.define.bind(customElements);
customElements.define = function(name: string, constructor: any, options?: any) {
  if (name === 'vite-error-overlay') {
    console.warn('Blocked vite-error-overlay registration');
    return;
  }
  return originalDefine(name, constructor, options);
};

// Suppress Vite HMR errors
if (import.meta.hot) {
  import.meta.hot.on('vite:error', (err) => {
    console.error('Vite error (suppressed):', err);
  });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
