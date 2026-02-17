import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v10
// Prevent Vite error overlay frame access errors

// Comprehensive error overlay blocking
if (typeof window !== 'undefined') {
  // Block error overlay before Vite tries to create it
  const originalDefine = customElements.define.bind(customElements);
  customElements.define = function(name: string, constructor: any, options?: any) {
    if (name === 'vite-error-overlay') {
      console.warn('Blocked vite-error-overlay registration');
      return;
    }
    return originalDefine(name, constructor, options);
  };

  // Suppress window errors that trigger overlays
  window.addEventListener('error', (e) => {
    if (e.message?.includes('frame')) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('Suppressed frame access error');
    }
  }, true);

  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('frame')) {
      e.preventDefault();
      console.warn('Suppressed frame-related promise rejection');
    }
  });
}

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
