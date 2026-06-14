const getApiBase = () => {
  // 1. If VITE_API_BASE is injected by the build process, use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // 2. If running in a browser locally, fallback to localhost
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  
  // 3. Fallback production Render URL
  return 'https://clinic-management-platform.onrender.com/api';
};

export const API_BASE = getApiBase();
export const STATIC_BASE = API_BASE.replace('/api', '');
