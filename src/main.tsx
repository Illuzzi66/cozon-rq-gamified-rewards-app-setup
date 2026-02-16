import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v6
// Aggressively prevent Vite error overlay frame access errors

// Override customElements.define to block error overlay registration
const originalDefine = customElements.define.bind(customElements);
customElements.define = function(name: string, constructor: any, options?: any) {
  if (name === 'vite-error-overlay') {
    console.warn('Blocked vite-error-overlay registration');
    return;
  }
  return originalDefine(name, constructor, options);
};

// Prevent error overlay creation at the document level
const originalCreateElement = document.createElement.bind(document);
document.createElement = function(tagName: string, options?: any) {
  if (tagName === 'vite-error-overlay') {
    console.warn('Blocked vite-error-overlay creation');
    return originalCreateElement('div', options);
  }
  return originalCreateElement(tagName, options);
};

// Suppress Vite HMR errors
if (import.meta.hot) {
  import.meta.hot.on('vite:error', (err) => {
    console.error('Vite error (suppressed):', err);
  });
  
  // Remove any error overlays that slip through
  const removeOverlays = () => {
    document.querySelectorAll('vite-error-overlay').forEach(el => el.remove());
  };
  
  import.meta.hot.on('vite:beforeUpdate', removeOverlays);
  import.meta.hot.on('vite:afterUpdate', removeOverlays);
  setInterval(removeOverlays, 100);
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
