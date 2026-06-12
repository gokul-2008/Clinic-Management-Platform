import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_BASE = 'http://localhost:5000/api';

export default function Doctors({ toggleMobileSidebar }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const role = localStorage.getItem('role');

  // Form State
  const [form, setForm] = useState({
    name: '',
    specialty: '',
    phone: '',
    consultationFee: '',
    availability: [
      { day: 'Monday', hours: '09:00 AM - 05:00 PM' }
    ]
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchDoctors = async () => {
    try {
      const res = await axios.get(`${API_BASE}/doctors`, getHeaders());
      setDoctors(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch doctor registries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvailabilityChange = (index, field, value) => {
    const updated = [...form.availability];
    updated[index][field] = value;
    setForm({ ...form, availability: updated });
  };

  const addAvailabilityRow = () => {
    setForm({
      ...form,
      availability: [...form.availability, { day: 'Monday', hours: '09:00 AM - 05:00 PM' }]
    });
  };

  const removeAvailabilityRow = (index) => {
    const updated = form.availability.filter((_, i) => i !== index);
    setForm({ ...form, availability: updated });
  };

  const openAddModal = () => {
    setForm({
      name: '',
      specialty: '',
      phone: '',
      consultationFee: '',
      availability: [{ day: 'Monday', hours: '09:00 AM - 05:00 PM' }]
    });
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (doctor) => {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      phone: doctor.phone,
      consultationFee: doctor.consultationFee,
      availability: doctor.availability.length > 0 ? doctor.availability : [{ day: 'Monday', hours: '09:00 AM - 05:00 PM' }]
    });
    setCurrentId(doctor._id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`${API_BASE}/doctors/${currentId}`, form, getHeaders());
        setSuccessMsg('Doctor registration details updated.');
      } else {
        await axios.post(`${API_BASE}/doctors`, form, getHeaders());
        setSuccessMsg('Doctor registry added successfully.');
      }
      setShowModal(false);
      fetchDoctors();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to write doctor profile.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Warning: Deleting this doctor will also remove all their scheduled appointments. Continue?')) {
      try {
        await axios.delete(`${API_BASE}/doctors/${id}`, getHeaders());
        setSuccessMsg('Doctor record deleted.');
        fetchDoctors();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
        setError('Failed to delete doctor records.');
      }
    }
  };

  return (
    <>
      <Navbar title="Doctor Registry" toggleMobileSidebar={toggleMobileSidebar} />

      {error && (
        <div className="alert alert-danger border-0 rounded-3 mb-4 p-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success border-0 rounded-3 mb-4 p-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
          <i className="bi bi-check-circle-fill"></i>
          <div>{successMsg}</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="d-flex justify-content-end mb-4">
        {role === 'Admin' && (
          <button className="btn-primary-grad" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-2"></i>
            Register Doctor
          </button>
        )}
      </div>

      {/* Doctor Grid cards */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="glass-card text-center py-5 text-secondary">
          <i className="bi bi-person-badge fs-1 d-block mb-3"></i>
          No doctors registered in the system
        </div>
      ) : (
        <div className="row g-4">
          {doctors.map((doc) => (
            <div key={doc._id} className="col-12 col-md-6 col-xl-4">
              <div className="glass-card h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="bg-primary rounded-circle text-white d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                      <i className="bi bi-person-fill-gear"></i>
                    </div>
                    <div>
                      <h5 className="m-0 text-white fw-bold">Dr. {doc.name}</h5>
                      <span className="badge bg-primary-subtle text-primary mt-1">{doc.specialty}</span>
                    </div>
                  </div>

                  <div className="text-secondary mb-3 small">
                    <div className="mb-1"><i className="bi bi-telephone me-2"></i>{doc.phone}</div>
                    <div><i className="bi bi-cash me-2"></i>Fee: ${doc.consultationFee} / session</div>
                  </div>

                  <div className="mb-3">
                    <h6 className="text-white fw-semibold mb-2" style={{ fontSize: '13px' }}>Weekly Availability:</h6>
                    {doc.availability.length === 0 ? (
                      <span className="text-secondary small italic">Not configured</span>
                    ) : (
                      doc.availability.map((av, index) => (
                        <div key={index} className="d-flex justify-content-between text-xs text-secondary py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <strong>{av.day}</strong>
                          <span>{av.hours}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {role === 'Admin' && (
                  <div className="d-flex gap-2 pt-3 border-top border-secondary-subtle">
                    <button className="btn btn-outline-info btn-sm flex-grow-1 rounded-3" onClick={() => openEditModal(doc)}>
                      <i className="bi bi-pencil-square me-1"></i> Edit
                    </button>
                    <button className="btn btn-outline-danger btn-sm rounded-3" onClick={() => handleDelete(doc._id)}>
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      {showModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '540px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">{editMode ? 'Edit Doctor Record' : 'Register New Doctor'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Doctor Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Dr. Stephen Strange"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Specialization</label>
                    <input
                      type="text"
                      className="form-control"
                      name="specialty"
                      value={form.specialty}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Cardiology, Pediatrics"
                    />
                  </div>
                  <div className="row">
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Contact Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        name="phone"
                        value={form.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Consultation Fee ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="consultationFee"
                        value={form.consultationFee}
                        onChange={handleInputChange}
                        required
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="mb-2 d-flex justify-content-between align-items-center">
                    <label className="form-label text-secondary fw-semibold m-0">Availability Schedule</label>
                    <button type="button" className="btn btn-outline-primary btn-sm rounded-pill py-0.5 px-2" onClick={addAvailabilityRow}>
                      <i className="bi bi-plus"></i> Add Day
                    </button>
                  </div>

                  {form.availability.map((av, index) => (
                    <div key={index} className="row g-2 mb-2 align-items-center bg-dark p-2 rounded-3" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="col-5">
                        <select
                          className="form-select form-select-sm"
                          value={av.day}
                          onChange={(e) => handleAvailabilityChange(index, 'day', e.target.value)}
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-5">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={av.hours}
                          onChange={(e) => handleAvailabilityChange(index, 'hours', e.target.value)}
                          placeholder="e.g. 09:00 AM - 05:00 PM"
                          required
                        />
                      </div>
                      <div className="col-2 text-center">
                        <button type="button" className="btn btn-outline-danger btn-sm border-0" onClick={() => removeAvailabilityRow(index)}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary-grad">{editMode ? 'Update' : 'Register'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
