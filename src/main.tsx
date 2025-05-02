
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/common/ErrorBoundary'

// Properly handle any loading errors at the root level
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

// Add error boundary to catch module loading errors
createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
