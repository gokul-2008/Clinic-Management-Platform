import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Receptionist'); // For registration toggle
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Patient registration profile state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const navigate = useNavigate();

  const handleDemoLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const payload = role === 'Patient'
          ? { email, password, role, name, age: Number(age), gender, phone, address }
          : { email, password, role };
        const res = await axios.post(`${API_BASE}/auth/register`, payload);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('email', res.data.email);
        if (res.data.associatedId) {
          localStorage.setItem('associatedId', res.data.associatedId);
        }
        navigate('/');
      } else {
        const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('email', res.data.email);
        if (res.data.associatedId) {
          localStorage.setItem('associatedId', res.data.associatedId);
        }
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="card glass-card border-0 p-4 w-100" style={{ maxWidth: '440px', margin: '20px' }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary rounded-circle mb-3 text-white" style={{ width: '60px', height: '60px' }}>
            <i className="bi bi-heart-pulse-fill fs-2"></i>
          </div>
          <h2 className="text-white fw-bold">CarePulse Portal</h2>
          <p className="text-secondary mb-0">Clinic Management & Clinical Registry</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 rounded-3 mb-3 p-2.5 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '14px' }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. admin@carepulse.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold">Register As</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="Patient">Patient / Self Portal</option>
                <option value="Admin">Administrator</option>
                <option value="Doctor">Doctor / Clinical Staff</option>
                <option value="Receptionist">Receptionist / Front Desk</option>
              </select>
            </div>
          )}

          {isRegister && role === 'Patient' && (
            <div className="bg-dark p-3 rounded-3 mb-3" style={{ border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <span className="d-block text-white fw-bold mb-3 small"><i className="bi bi-person-badge-fill text-primary me-2"></i>Create Patient Profile</span>
              <div className="mb-2">
                <label className="form-label text-secondary fw-semibold text-xs m-0">Full Name</label>
                <input type="text" className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="row g-2">
                <div className="col-6 mb-2">
                  <label className="form-label text-secondary fw-semibold text-xs m-0">Age</label>
                  <input type="number" className="form-control form-control-sm" value={age} onChange={(e) => setAge(e.target.value)} required min="0" />
                </div>
                <div className="col-6 mb-2">
                  <label className="form-label text-secondary fw-semibold text-xs m-0">Gender</label>
                  <select className="form-select form-select-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label text-secondary fw-semibold text-xs m-0">Phone</label>
                <input type="text" className="form-control form-control-sm" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="form-label text-secondary fw-semibold text-xs m-0">Address</label>
                <textarea className="form-control form-control-sm" value={address} onChange={(e) => setAddress(e.target.value)} required rows="2" />
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary-grad w-100 py-2.5 mt-2" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              isRegister ? 'Register Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Demo Accounts Panel */}
        {!isRegister && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="d-block text-secondary fw-semibold mb-2" style={{ fontSize: '13px' }}>Quick Demo Access:</span>
            <div className="d-flex flex-column gap-2">
              <button 
                className="btn btn-dark btn-sm text-start py-1.5 px-3 rounded-3 border-0 d-flex justify-content-between align-items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#60a5fa' }}
                onClick={() => handleDemoLogin('admin@carepulse.com', 'admin123')}
              >
                <span>🔑 Admin Credentials</span>
                <small className="text-secondary">Full Access</small>
              </button>
              <button 
                className="btn btn-dark btn-sm text-start py-1.5 px-3 rounded-3 border-0 d-flex justify-content-between align-items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#34d399' }}
                onClick={() => handleDemoLogin('doctor@carepulse.com', 'doctor123')}
              >
                <span>🥼 Doctor Credentials</span>
                <small className="text-secondary">Prescriptions</small>
              </button>
              <button 
                className="btn btn-dark btn-sm text-start py-1.5 px-3 rounded-3 border-0 d-flex justify-content-between align-items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#fbbf24' }}
                onClick={() => handleDemoLogin('staff@carepulse.com', 'staff123')}
              >
                <span>📋 Receptionist Credentials</span>
                <small className="text-secondary">Front Desk</small>
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-4">
          <button 
            type="button" 
            className="btn btn-link text-secondary text-decoration-none btn-sm"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
