import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v4
// Prevent Vite error overlay frame access errors
if (import.meta.hot) {
  import.meta.hot.on('vite:error', (err) => {
    console.error('Vite error:', err);
  });
  
  // Disable default error overlay to prevent frame access errors
  import.meta.hot.on('vite:beforeUpdate', () => {
    const errorOverlay = document.querySelector('vite-error-overlay');
    if (errorOverlay) {
      errorOverlay.remove();
    }
  });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
