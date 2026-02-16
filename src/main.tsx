import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v5
// Completely disable Vite error overlay to prevent frame access errors
if (import.meta.hot) {
  // Suppress all Vite errors
  import.meta.hot.on('vite:error', (err) => {
    console.error('Vite error:', err);
  });
  
  // Remove error overlays immediately
  const removeOverlays = () => {
    document.querySelectorAll('vite-error-overlay').forEach(el => el.remove());
  };
  
  import.meta.hot.on('vite:beforeUpdate', removeOverlays);
  import.meta.hot.on('vite:afterUpdate', removeOverlays);
  
  // Continuously monitor and remove overlays
  setInterval(removeOverlays, 100);
}

// Prevent error overlay creation at the document level
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tagName: string, options?: any) {
  if (tagName === 'vite-error-overlay') {
    console.warn('Blocked vite-error-overlay creation');
    return originalCreateElement('div', options);
  }
  return originalCreateElement(tagName, options);
};

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
