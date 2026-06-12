import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import Billing from './pages/Billing';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Inventory from './pages/Inventory';


export default function App() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileSidebar = (state) => {
    setIsMobileOpen(state !== undefined ? state : !isMobileOpen);
  };

  const Layout = ({ children }) => {
    return (

      
      <div className="app-container">
        <Sidebar isMobileOpen={isMobileOpen} toggleMobileSidebar={toggleMobileSidebar} />
        <main className="main-content">
          {children}
        </main>
      </div>
    );
  };

  const HomeRoute = () => {
    const role = localStorage.getItem('role');
    if (role === 'Patient') {
      return <Navigate to="/patient-dashboard" replace />;
    }
    return <Dashboard toggleMobileSidebar={() => toggleMobileSidebar(true)} />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Guarded Routes with Layout wrapper */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <HomeRoute />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/patient-dashboard" element={
          <ProtectedRoute allowedRoles={['Patient']}>
            <Layout>
              <PatientDashboard toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/patients" element={
          <ProtectedRoute allowedRoles={['Admin', 'Receptionist', 'Doctor']}>
            <Layout>
              <Patients toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/doctors" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Doctors toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/appointments" element={
          <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
            <Layout>
              <Appointments toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/records" element={
          <ProtectedRoute allowedRoles={['Doctor']}>
            <Layout>
              <MedicalRecords toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/billing" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Billing toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Inventory toggleMobileSidebar={() => toggleMobileSidebar(true)} />
            </Layout>
          </ProtectedRoute>
        } />


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
