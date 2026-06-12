import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_BASE = 'http://localhost:5000/api';

export default function Appointments({ toggleMobileSidebar }) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const role = localStorage.getItem('role');

  // Form State
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    status: 'Booked'
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const [apptRes, patientRes, doctorRes] = await Promise.all([
        axios.get(`${API_BASE}/appointments`, getHeaders()),
        axios.get(`${API_BASE}/patients`, getHeaders()),
        axios.get(`${API_BASE}/doctors`, getHeaders())
      ]);
      setAppointments(apptRes.data);
      setPatients(patientRes.data);
      setDoctors(doctorRes.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch appointment resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    if (patients.length === 0) {
      alert('Please register at least one patient first.');
      return;
    }
    if (doctors.length === 0) {
      alert('Please register at least one doctor first.');
      return;
    }
    setForm({
      patientId: patients[0]._id,
      doctorId: doctors[0]._id,
      date: '',
      time: '',
      status: 'Booked'
    });
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (appt) => {
    const formattedDate = appt.date ? new Date(appt.date).toISOString().split('T')[0] : '';
    setForm({
      patientId: appt.patientId?._id || '',
      doctorId: appt.doctorId?._id || '',
      date: formattedDate,
      time: appt.time,
      status: appt.status
    });
    setCurrentId(appt._id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`${API_BASE}/appointments/${currentId}`, form, getHeaders());
        setSuccessMsg('Appointment details rescheduled.');
      } else {
        await axios.post(`${API_BASE}/appointments`, form, getHeaders());
        setSuccessMsg('Appointment scheduled successfully.');
      }
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to log appointment details.');
    }
  };

  const handleDelete = async (id) => {
    if (role !== 'Admin') {
      alert('Only Administrators can delete scheduled session logs.');
      return;
    }
    if (window.confirm('Remove this appointment record?')) {
      try {
        await axios.delete(`${API_BASE}/appointments/${id}`, getHeaders());
        setSuccessMsg('Appointment records deleted.');
        fetchData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
        setError('Failed to purge appointment record.');
      }
    }
  };

  const handleQuickStatusUpdate = async (appt, newStatus) => {
    try {
      await axios.put(`${API_BASE}/appointments/${appt._id}`, { status: newStatus }, getHeaders());
      setSuccessMsg(`Appointment marked as ${newStatus}.`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to alter appointment status.');
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter === 'All') return true;
    return appt.status === statusFilter;
  });

  return (
    <>
      <Navbar title="Appointment Manager" toggleMobileSidebar={toggleMobileSidebar} />

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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="d-flex gap-2 bg-secondary-subtle p-1 rounded-3" style={{ maxWidth: 'max-content', backgroundColor: 'rgba(255,255,255,0.03)' }}>
          {['All', 'Booked', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              className={`btn btn-sm rounded-2 px-3 py-1.5 fw-medium border-0 ${
                statusFilter === status ? 'btn-primary bg-primary text-white' : 'btn-link text-secondary text-decoration-none'
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <button className="btn-primary-grad" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-2"></i>
          Book Appointment
        </button>
      </div>

      {/* List Table */}
      <div className="glass-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-calendar-x fs-1 d-block mb-3"></i>
            No appointments booked
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-borderless table-custom m-0">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Assigned Doctor</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Update Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => (
                  <tr key={appt._id}>
                    <td className="fw-semibold">
                      {appt.patientId ? (
                        <div>
                          <div className="text-white">{appt.patientId.name}</div>
                          <small className="text-secondary">{appt.patientId.phone}</small>
                        </div>
                      ) : (
                        <span className="text-secondary">Deleted Patient</span>
                      )}
                    </td>
                    <td>
                      {appt.doctorId ? (
                        <div>
                          <div className="text-white">Dr. {appt.doctorId.name}</div>
                          <small className="text-secondary">{appt.doctorId.specialty}</small>
                        </div>
                      ) : (
                        <span className="text-secondary">Unassigned Doctor</span>
                      )}
                    </td>
                    <td>{new Date(appt.date).toLocaleDateString()}</td>
                    <td>{appt.time}</td>
                    <td>
                      <span className={`badge-status badge-${appt.status.toLowerCase()}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-outline-success btn-xs py-0.5 px-2 rounded-2 text-xs border-0"
                          title="Complete"
                          onClick={() => handleQuickStatusUpdate(appt, 'Completed')}
                          disabled={appt.status === 'Completed'}
                        >
                          <i className="bi bi-check2-circle fs-6"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger btn-xs py-0.5 px-2 rounded-2 text-xs border-0"
                          title="Cancel"
                          onClick={() => handleQuickStatusUpdate(appt, 'Cancelled')}
                          disabled={appt.status === 'Cancelled'}
                        >
                          <i className="bi bi-slash-circle fs-6"></i>
                        </button>
                      </div>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-outline-info btn-sm me-2 rounded-3 border-0" onClick={() => openEditModal(appt)}>
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      {role === 'Admin' && (
                        <button className="btn btn-outline-danger btn-sm rounded-3 border-0" onClick={() => handleDelete(appt._id)}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book / Edit Modal */}
      {showModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '500px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">{editMode ? 'Reschedule Appointment' : 'Book Appointment'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Patient</label>
                    <select
                      className="form-select"
                      name="patientId"
                      value={form.patientId}
                      onChange={handleInputChange}
                      required
                      disabled={editMode}
                    >
                      {patients.map((pat) => (
                        <option key={pat._id} value={pat._id}>
                          {pat.name} ({pat.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Doctor</label>
                    <select
                      className="form-select"
                      name="doctorId"
                      value={form.doctorId}
                      onChange={handleInputChange}
                      required
                    >
                      {doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          Dr. {doc.name} ({doc.specialty})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row">
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="date"
                        value={form.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Time Slot</label>
                      <input
                        type="text"
                        className="form-control"
                        name="time"
                        value={form.time}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. 11:30 AM"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Status</label>
                    <select className="form-select" name="status" value={form.status} onChange={handleInputChange}>
                      <option value="Booked">Booked</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary-grad">{editMode ? 'Update' : 'Schedule'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
