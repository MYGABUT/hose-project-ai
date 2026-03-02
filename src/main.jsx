import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/print.css'
import App from './App.jsx'

import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary'

// Global Fetch Interceptor to handle 401 Unauthorized API responses
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);

  // If an API endpoint throws 401 Unauthorized, token has expired or is invalid.
  if (response.status === 401) {
    // Prevent redirect loop if already on login page
    if (!window.location.pathname.includes('/login')) {
      console.warn('401 Unauthorized detected. Clearing session...');
      localStorage.removeItem('hosepro_user');
      window.location.href = '/login?expired=true';
    }
  }

  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
