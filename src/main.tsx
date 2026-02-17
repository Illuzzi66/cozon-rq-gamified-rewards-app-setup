import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v7
// Lightweight error overlay suppression

// Suppress Vite HMR errors without blocking customElements
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
