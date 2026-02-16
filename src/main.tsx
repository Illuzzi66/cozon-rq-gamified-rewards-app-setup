import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Main entry point - Application bootstrap v3
// Prevent Vite error overlay frame access errors
if (import.meta.hot) {
  import.meta.hot.on('vite:error', (err) => {
    console.error('Vite error:', err);
  });
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
