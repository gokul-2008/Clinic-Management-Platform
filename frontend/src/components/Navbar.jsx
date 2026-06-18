import React, { useState, useEffect } from 'react';

export default function Navbar({ title, toggleMobileSidebar }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-transparent px-0 mb-4">
      <div className="container-fluid px-0">
        <div className="d-flex align-items-center gap-3">
          <button 
            className="btn btn-outline-secondary d-lg-none"
            style={{ borderColor: 'var(--border-color)' }}
            onClick={toggleMobileSidebar}
            type="button"
          >
            <i className="bi bi-list fs-4" style={{ color: 'var(--text-primary)' }}></i>
          </button>
          <h2 className="m-0 fw-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        
        <div className="d-flex align-items-center gap-3 ms-auto">
          {/* Theme Toggle Button */}
          <button
            className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2 rounded-circle border-0"
            onClick={toggleTheme}
            style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: 'rgba(255, 255, 255, 0.05)', 
              color: 'var(--text-primary)',
              transition: 'background-color 0.2s ease, transform 0.2s ease'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            type="button"
          >
            {theme === 'dark' ? (
              <i className="bi bi-sun-fill text-warning fs-5"></i>
            ) : (
              <i className="bi bi-moon-fill text-primary fs-5"></i>
            )}
          </button>

          <div className="text-secondary d-none d-sm-block">
            <i className="bi bi-calendar3 me-2"></i>
            {currentDate}
          </div>
          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2">
            <span className="spinner-grow spinner-grow-sm text-success me-2" style={{ width: '8px', height: '8px' }} role="status" aria-hidden="true"></span>
            Live
          </span>
        </div>
      </div>
    </nav>
  );
}
