import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar({ isMobileOpen, toggleMobileSidebar }) {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const email = localStorage.getItem('email');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    navigate('/login');
  };

  const hasAccess = (allowedRoles) => {
    return allowedRoles.includes(role);
  };

  return (
    <aside className={`sidebar d-flex flex-column ${isMobileOpen ? 'show' : ''}`}>
      <div className="p-4 d-flex align-items-center justify-content-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <h4 className="m-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <i className="bi bi-heart-pulse-fill text-primary"></i>
          <span>CarePulse</span>
        </h4>
      
        <button 
          className="btn btn-dark d-lg-none"
          onClick={() => toggleMobileSidebar(false)}
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
    
      <div className="nav flex-column nav-pills mt-4 flex-grow-1">
        {hasAccess(['Admin', 'Doctor', 'Receptionist']) && (
          <NavLink 
            to="/" 
            end 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-grid-fill"></i>
            <span>Dashboard</span>
          </NavLink>
        )}

        {hasAccess(['Patient']) && (
          <NavLink 
            to="/patient-dashboard" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-person-fill"></i>
            <span>My Portal</span>
          </NavLink>
        )}

        {hasAccess(['Admin', 'Receptionist', 'Doctor']) && (
          <NavLink 
            to="/patients" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-people-fill"></i>
            <span>Patients</span>
          </NavLink>
        )}

        {hasAccess(['Admin']) && (
          <NavLink 
            to="/doctors" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-person-badge-fill"></i>
            <span>Doctors</span>
          </NavLink>
        )}

        {hasAccess(['Admin', 'Receptionist']) && (
          <NavLink 
            to="/appointments" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-calendar-event-fill"></i>
            <span>Appointments</span>
          </NavLink>
        )}

        {hasAccess(['Doctor']) && (
          <NavLink 
            to="/records" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-file-medical-fill"></i>
            <span>Medical Records</span>
          </NavLink>
        )}

        {hasAccess(['Admin']) && (
          <NavLink 
            to="/billing" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-receipt"></i>
            <span>Billing</span>
          </NavLink>
        )}

        {hasAccess(['Admin']) && (
          <NavLink 
            to="/inventory" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => toggleMobileSidebar(false)}
          >
            <i className="bi bi-prescription2"></i>
            <span>Inventory</span>
          </NavLink>
        )}

      </div>

      <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="d-flex align-items-center gap-3 mb-3" style={{ color: 'var(--text-primary)' }}>
          <div className="bg-primary rounded-circle text-white d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
            <i className="bi bi-person-fill fs-5"></i>
          </div>
          <div className="overflow-hidden">
            <h6 className="m-0 fw-semibold text-truncate" style={{ fontSize: '14px' }}>{email || 'User'}</h6>
            <small className="text-secondary">{role}</small>
          </div>
        </div>
        <button className="btn btn-outline-danger w-100 btn-sm rounded-3 py-2" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>
          Logout
        </button>
      </div>
    </aside>
  );
}
