import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_BASE_URL } from './config'

const originalFetch = window.fetch;
window.fetch = (url, options) => {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    return originalFetch(`${API_BASE_URL}${url}`, options);
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
