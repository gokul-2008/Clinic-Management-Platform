import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { downloadPrescriptionPDF } from '../utils/pdfGenerator';

const API_BASE = 'http://localhost:5000/api';

export default function Patients({ toggleMobileSidebar }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState({ patient: {}, records: [], appointments: [] });
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Document management states
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docError, setDocError] = useState('');

  const role = localStorage.getItem('role');

  // Details Modal Tab & Filter States
  const [detailTab, setDetailTab] = useState('timeline'); // 'timeline', 'records', 'appointments', 'reports', 'billing'
  const [timelineStartDate, setTimelineStartDate] = useState('');
  const [timelineEndDate, setTimelineEndDate] = useState('');
  const [timelineDoctorFilter, setTimelineDoctorFilter] = useState('');

  const getTimelineDoctors = () => {
    const docIds = new Set();
    const uniqueDocs = [];
    const records = selectedHistory.records || [];
    const appointments = selectedHistory.appointments || [];
    [...records, ...appointments].forEach(item => {
      const doc = item.doctorId;
      if (doc && doc._id && !docIds.has(doc._id)) {
        docIds.add(doc._id);
        uniqueDocs.push(doc);
      }
    });
    return uniqueDocs;
  };

  const getTimelineEvents = () => {
    const events = [];
    const records = selectedHistory.records || [];
    const appointments = selectedHistory.appointments || [];
    const bills = selectedHistory.bills || [];

    // 1. Medical Records
    records.forEach(rec => {
      events.push({
        id: `rec-${rec._id}`,
        date: new Date(rec.createdAt),
        type: 'Prescription',
        title: `Clinical Diagnosis: ${rec.diagnosis}`,
        subtitle: `Consultation with Dr. ${rec.doctorId?.name || 'Physician'}`,
        color: '#10b981', // emerald green
        icon: 'bi-prescription text-emerald',
        data: rec
      });
    });

    // 2. Appointments
    appointments.forEach(appt => {
      events.push({
        id: `appt-${appt._id}`,
        date: new Date(appt.date),
        type: 'Appointment',
        title: `Appointment Scheduled`,
        subtitle: `Attending: Dr. ${appt.doctorId?.name || 'Physician'} (${appt.doctorId?.specialty || 'General'})`,
        color: '#3b82f6', // blue
        icon: 'bi-calendar-check text-blue',
        data: appt
      });
    });

    // 3. Lab Reports
    documents.forEach(doc => {
      events.push({
        id: `doc-${doc._id}`,
        date: new Date(doc.createdAt),
        type: 'LabReport',
        title: `Lab Report: ${doc.title}`,
        subtitle: `Uploaded by ${doc.uploadedBy || 'Portal User'}`,
        color: '#8b5cf6', // purple
        icon: 'bi-file-earmark-medical text-purple',
        data: doc
      });
    });

    // 4. Billing
    bills.forEach(bill => {
      events.push({
        id: `bill-${bill._id}`,
        date: new Date(bill.createdAt),
        type: 'Billing',
        title: `Invoice Raised: ${bill.services}`,
        subtitle: `Amount: $${bill.totalAmount.toLocaleString()}`,
        color: '#f59e0b', // amber
        icon: 'bi-credit-card text-amber',
        data: bill
      });
    });

    // Sort chronologically descending
    const sorted = events.sort((a, b) => b.date - a.date);

    // Apply filtering
    return sorted.filter(e => {
      if (timelineDoctorFilter) {
        if (e.type === 'Prescription' && e.data.doctorId?._id !== timelineDoctorFilter) return false;
        if (e.type === 'Appointment' && e.data.doctorId?._id !== timelineDoctorFilter) return false;
        if (e.type === 'LabReport' || e.type === 'Billing') return false;
      }
      if (timelineStartDate) {
        const start = new Date(timelineStartDate);
        start.setHours(0, 0, 0, 0);
        if (e.date < start) return false;
      }
      if (timelineEndDate) {
        const end = new Date(timelineEndDate);
        end.setHours(23, 59, 59, 999);
        if (e.date > end) return false;
      }
      return true;
    });
  };

  const timelineEvents = getTimelineEvents();
  const timelineDoctors = getTimelineDoctors();

  // Form State
  const [form, setForm] = useState({
    patientId: '',
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/patients`, getHeaders());
      setPatients(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load patients catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setForm({ patientId: '', name: '', age: '', gender: 'Male', phone: '', address: '' });
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (e, patient) => {
    e.stopPropagation(); // Avoid triggering details modal
    setForm({
      patientId: patient.patientId || '',
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address
    });
    setCurrentId(patient._id);
    setEditMode(true);
    setShowModal(true);
  };

  const openDetailsModal = async (patient) => {
    try {
      setDocError('');
      setDocTitle('');
      setSelectedFile(null);
      
      // Reset filter and tab states
      setTimelineStartDate('');
      setTimelineEndDate('');
      setTimelineDoctorFilter('');
      setDetailTab('timeline');

      const res = await axios.get(`${API_BASE}/patients/${patient._id}`, getHeaders());
      setSelectedHistory(res.data);
      
      const docRes = await axios.get(`${API_BASE}/documents/patient/${patient._id}`, getHeaders());
      setDocuments(docRes.data);
      
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve patient clinical timelines.');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !docTitle) {
      setDocError('Please provide a document title and select a file.');
      return;
    }
    setUploadingDoc(true);
    setDocError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', selectedHistory.patient._id);
      formData.append('title', docTitle);

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      await axios.post(`${API_BASE}/documents/upload`, formData, config);
      
      // Refresh documents
      const docRes = await axios.get(`${API_BASE}/documents/patient/${selectedHistory.patient._id}`, getHeaders());
      setDocuments(docRes.data);
      setDocTitle('');
      setSelectedFile(null);
      
      // Clear file input
      const fileInput = document.getElementById('docFileInput');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error(err);
      setDocError(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleFileDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`${API_BASE}/documents/${docId}`, getHeaders());
      
      // Refresh documents
      const docRes = await axios.get(`${API_BASE}/documents/patient/${selectedHistory.patient._id}`, getHeaders());
      setDocuments(docRes.data);
    } catch (err) {
      console.error(err);
      setDocError('Failed to delete document.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.patientId || payload.patientId.trim() === '') {
        delete payload.patientId;
      }
      if (editMode) {
        await axios.put(`${API_BASE}/patients/${currentId}`, payload, getHeaders());
        setSuccessMsg('Patient record updated successfully.');
      } else {
        await axios.post(`${API_BASE}/patients`, payload, getHeaders());
        setSuccessMsg('Patient registered successfully.');
      }
      setShowModal(false);
      fetchPatients();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save patient records.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Avoid details modal
    if (window.confirm('Warning: Deleting this patient will also wipe out their clinical histories, bills, and scheduled appointments. Proceed?')) {
      try {
        await axios.delete(`${API_BASE}/patients/${id}`, getHeaders());
        setSuccessMsg('Patient profile and timelines purged.');
        fetchPatients();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Access Denied: Only Administrators can delete patient logs.');
      }
    }
  };

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.phone.includes(term) ||
      (p.patientId && p.patientId.toLowerCase().includes(term))
    );
  });

  return (
    <>
      <Navbar title="Patient Directory" toggleMobileSidebar={toggleMobileSidebar} />

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
        <div className="input-group" style={{ maxWidth: '400px' }}>
          <span className="input-group-text bg-dark border-secondary text-secondary" style={{ borderColor: 'var(--border-color)' }}>
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by patient name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {role !== 'Doctor' && (
          <button className="btn-primary-grad" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-2"></i>
            Register Patient
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="glass-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-people fs-1 d-block mb-3"></i>
            No patients registered
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-borderless table-custom m-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient,index) => (
                  <tr
                    key={patient._id}
                    onClick={() => openDetailsModal(patient)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full medical history"
                  >
                    <td className="text-secondary fw-semibold">{filteredPatients[filteredPatients.length - 1 - index].patientId || 'N/A'}</td>
                    <td className="fw-semibold text-primary">{patient.name}</td>
                    <td>{patient.age}</td>
                    <td>
                      <span className="badge bg-secondary-subtle text-dark rounded-pill px-2.5 py-1">
                        {patient.gender}
                      </span>
                    </td>
                    <td>{patient.phone}</td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }}>{patient.address}</td>
                    <td className="text-end">
                      {role !== 'Doctor' && (
                        <button 
                          className="btn btn-outline-info btn-sm me-2 rounded-3 border-0" 
                          onClick={(e) => openEditModal(e, patient)}
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                      )}
                      {role === 'Admin' && (
                        <button 
                          className="btn btn-outline-danger btn-sm rounded-3 border-0" 
                          onClick={(e) => handleDelete(e, patient._id)}
                        >
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

      {/* Add / Edit Patient Modal */}
      {showModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '500px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">{editMode ? 'Edit Patient File' : 'Register New Patient'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Patient ID</label>
                    <input
                      type="text"
                      className="form-control"
                      name="patientId"
                      value={form.patientId}
                      onChange={handleInputChange}
                      placeholder={editMode ? "" : "Auto-generated if left blank"}
                      disabled={editMode}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Patient Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="row">
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Age</label>
                      <input
                        type="number"
                        className="form-control"
                        name="age"
                        value={form.age}
                        onChange={handleInputChange}
                        required
                        min="0"
                      />
                    </div>
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Gender</label>
                      <select className="form-select" name="gender" value={form.gender} onChange={handleInputChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Address</label>
                    <textarea
                      className="form-control"
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      required
                      rows="3"
                    />
                  </div>
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

      {/* Patient Visits / Medical History Modal */}
      {showDetailModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100 modal-lg" style={{ maxWidth: '800px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">
                  <i className="bi bi-clock-history text-primary me-2"></i>
                  Clinical Timeline: {selectedHistory.patient.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                
                {/* Vitals Summary Card */}
                {selectedHistory.records.length > 0 && (
                  <div className="glass-card mb-4 p-3 bg-secondary-subtle" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>
                    <h6 className="text-dark fw-bold mb-2">Last Checked Vitals</h6>
                    <div className="row text-center">
                      <div className="col-4 border-end border-secondary">
                        <small className="text-muted d-block">Blood Pressure</small>
                        <span className="text-dark fw-bold">{selectedHistory.records[0].vitals?.bloodPressure || 'N/A'}</span>
                      </div>
                      <div className="col-4 border-end border-secondary">
                        <small className="text-muted d-block">Heart Rate</small>
                        <span className="text-dark fw-bold">{selectedHistory.records[0].vitals?.heartRate ? `${selectedHistory.records[0].vitals.heartRate} bpm` : 'N/A'}</span>
                      </div>
                      <div className="col-4">
                        <small className="text-muted d-block">Weight</small>
                        <span className="text-dark fw-bold">{selectedHistory.records[0].vitals?.weight ? `${selectedHistory.records[0].vitals.weight} kg` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Tabs */}
                <div className="d-flex flex-wrap gap-2 border-bottom border-secondary-subtle pb-3 mb-4">
                  <button
                    onClick={() => setDetailTab('timeline')}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                      detailTab === 'timeline' ? 'btn-primary shadow' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-clock-history"></i>
                    <span>Clinical Timeline</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('records')}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                      detailTab === 'records' ? 'btn-primary shadow' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-prescription2"></i>
                    <span>Diagnoses & Rx</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('appointments')}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                      detailTab === 'appointments' ? 'btn-primary shadow' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-calendar-check"></i>
                    <span>Appointment Log</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('billing')}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                      detailTab === 'billing' ? 'btn-primary shadow' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-credit-card"></i>
                    <span>Invoices & Billing</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('reports')}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                      detailTab === 'reports' ? 'btn-primary shadow' : 'btn-outline-secondary'
                    }`}
                  >
                    <i className="bi bi-file-earmark-medical"></i>
                    <span>Lab Documents</span>
                  </button>
                </div>

                {/* Timeline Tab */}
                {detailTab === 'timeline' && (
                  <>
                    {/* Filters */}
                    <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-md-4">
                          <label className="form-label text-secondary fw-semibold text-xs mb-1">Filter by Physician</label>
                          <select
                            className="form-select form-select-sm"
                            value={timelineDoctorFilter}
                            onChange={(e) => setTimelineDoctorFilter(e.target.value)}
                          >
                            <option value="">All Doctors</option>
                            {timelineDoctors.map(doc => (
                              <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-6 col-md-3">
                          <label className="form-label text-secondary fw-semibold text-xs mb-1">Start Date</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={timelineStartDate}
                            onChange={(e) => setTimelineStartDate(e.target.value)}
                          />
                        </div>
                        <div className="col-6 col-md-3">
                          <label className="form-label text-secondary fw-semibold text-xs mb-1">End Date</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={timelineEndDate}
                            onChange={(e) => setTimelineEndDate(e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-md-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm w-100 rounded-3 py-1.5"
                            onClick={() => {
                              setTimelineDoctorFilter('');
                              setTimelineStartDate('');
                              setTimelineEndDate('');
                            }}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Timeline List */}
                    {timelineEvents.length === 0 ? (
                      <p className="text-secondary small text-center py-4">No events found matching current criteria.</p>
                    ) : (
                      <div className="timeline-container ps-4 position-relative" style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.08)', marginLeft: '10px' }}>
                        {timelineEvents.map((evt) => (
                          <div key={evt.id} className="timeline-event position-relative mb-4 pb-2" style={{ paddingLeft: '15px' }}>
                            <div 
                              className="position-absolute rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                left: '-28px',
                                top: '0px',
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#111317',
                                border: `2px solid ${evt.color}`,
                                zIndex: 2
                              }}
                            >
                              <i className={`bi ${evt.icon.split(' ')[0]}`} style={{ fontSize: '11px', color: evt.color }}></i>
                            </div>

                            <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap">
                                <div>
                                  <span className="badge mb-1.5" style={{ backgroundColor: `${evt.color}20`, color: evt.color, border: `1px solid ${evt.color}40`, fontSize: '10px', padding: '3px 8px', borderRadius: '10px' }}>
                                    {evt.type}
                                  </span>
                                  <h6 className="text-white fw-bold m-0 text-sm mt-1">{evt.title}</h6>
                                  <small className="text-secondary text-xs">{evt.subtitle}</small>
                                </div>
                                <div className="text-xs text-secondary text-md-end">
                                  {evt.date.toLocaleDateString()} at {evt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>

                              {evt.type === 'Prescription' && (
                                <div className="mt-2">
                                  {evt.data.notes && <p className="text-secondary text-sm italic mb-2">"{evt.data.notes}"</p>}
                                  {evt.data.prescriptions && evt.data.prescriptions.length > 0 && (
                                    <div className="p-2 rounded bg-dark mb-2" style={{ border: '1px solid rgba(255,255,255,0.02)' }}>
                                      <ul className="m-0 ps-3 text-secondary text-sm">
                                        {evt.data.prescriptions.map((pr, i) => (
                                          <li key={i}>{pr.drugName} - {pr.dosage} ({pr.frequency} for {pr.duration})</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="d-flex justify-content-end">
                                    <button 
                                      className="btn btn-outline-success btn-sm py-1 px-2.5 rounded-pill d-flex align-items-center gap-1.5 border border-success-subtle"
                                      style={{ fontSize: '11px' }}
                                      onClick={() => downloadPrescriptionPDF(evt.data)}
                                      type="button"
                                    >
                                      <i className="bi bi-file-earmark-arrow-down-fill"></i>
                                      <span>Prescription PDF</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {evt.type === 'Appointment' && (
                                <div className="mt-2 d-flex justify-content-between align-items-center flex-wrap gap-2 text-xs">
                                  <span className="text-secondary">
                                    Slot Time: <strong>{evt.data.time}</strong>
                                  </span>
                                  <span className={`badge-status badge-${evt.data.status.toLowerCase()}`}>{evt.data.status}</span>
                                </div>
                              )}

                              {evt.type === 'LabReport' && (
                                <div className="mt-2 d-flex justify-content-end gap-2">
                                  <a 
                                    href={`http://localhost:5000${evt.data.fileUrl}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-outline-info btn-sm py-1 px-2.5 rounded-pill d-flex align-items-center gap-1"
                                    style={{ fontSize: '11px' }}
                                  >
                                    <i className="bi bi-eye-fill"></i>
                                    <span>View Document</span>
                                  </a>
                                  <button 
                                    onClick={() => handleFileDelete(evt.data._id)} 
                                    className="btn btn-outline-danger btn-sm py-1 px-2.5 rounded-pill d-flex align-items-center gap-1"
                                    style={{ fontSize: '11px' }}
                                  >
                                    <i className="bi bi-trash-fill"></i>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}

                              {evt.type === 'Billing' && (
                                <div className="mt-2 d-flex justify-content-between align-items-center flex-wrap gap-2 text-xs">
                                  <div>
                                    <span className="text-secondary me-2">Invoice Status:</span>
                                    <span className={`badge-status badge-${evt.data.paymentStatus.toLowerCase()}`}>{evt.data.paymentStatus}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* visit records tab */}
                {detailTab === 'records' && (
                  <>
                    <h6 className="text-white fw-bold mb-3">Diagnoses & Prescriptions</h6>
                    {selectedHistory.records.length === 0 ? (
                      <p className="text-secondary small">No medical records on file for this patient.</p>
                    ) : (
                      selectedHistory.records.map((rec, index) => (
                        <div key={rec._id} className="mb-4 pb-3 border-bottom border-secondary" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                          <div className="d-flex justify-content-between align-items-center text-xs text-secondary mb-2">
                            <div>
                              <span>Visited: {new Date(rec.createdAt).toLocaleDateString()}</span>
                              <span className="mx-2">|</span>
                              <span>Attending: Dr. {rec.doctorId?.name} ({rec.doctorId?.specialty})</span>
                            </div>
                            {rec.prescriptions && rec.prescriptions.length > 0 && (
                              <button 
                                className="btn btn-outline-success btn-xs py-0.5 px-2 rounded-pill d-flex align-items-center gap-1 border-0"
                                style={{ fontSize: '11px' }}
                                onClick={() => downloadPrescriptionPDF(rec)}
                                type="button"
                              >
                                <i className="bi bi-file-earmark-arrow-down-fill"></i>
                                <span>PDF</span>
                              </button>
                            )}
                          </div>
                          <div className="mb-2">
                            <strong className="text-white">Diagnosis: </strong>
                            <span className="text-secondary">{rec.diagnosis}</span>
                          </div>
                          {rec.notes && (
                            <div className="mb-2 text-sm text-secondary italic">
                              <strong>Physician Notes: </strong>"{rec.notes}"
                            </div>
                          )}
                          {rec.prescriptions && rec.prescriptions.length > 0 && (
                            <div className="p-2 bg-dark rounded-3 mt-2" style={{ border: '1px solid rgba(255,255,255,0.02)' }}>
                              <span className="text-white fw-medium text-xs d-block mb-1">Prescribed Meds:</span>
                              <ul className="m-0 ps-3 text-secondary text-sm">
                                {rec.prescriptions.map((pr, idx) => (
                                  <li key={idx}>
                                    <span className="text-info">{pr.drugName}</span> - {pr.dosage} ({pr.frequency} for {pr.duration})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* Appointment Log Tab */}
                {detailTab === 'appointments' && (
                  <>
                    <h6 className="text-white fw-bold mb-3">Appointment Log</h6>
                    {selectedHistory.appointments.length === 0 ? (
                      <p className="text-secondary small">No past appointments recorded.</p>
                    ) : (
                      <ul className="list-group list-group-flush bg-transparent mb-4">
                        {selectedHistory.appointments.map((appt) => (
                          <li key={appt._id} className="list-group-item bg-transparent text-secondary px-0 py-2 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div>
                              <span className="text-white">Dr. {appt.doctorId?.name}</span>
                              <span className="mx-2 text-xs">|</span>
                              <span className="text-xs">{new Date(appt.date).toLocaleDateString()} at {appt.time}</span>
                            </div>
                            <span className={`badge-status badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {/* Billing Tab */}
                {detailTab === 'billing' && (
                  <>
                    <h6 className="text-white fw-bold mb-3">Patient Invoices & Bills</h6>
                    {!selectedHistory.bills || selectedHistory.bills.length === 0 ? (
                      <p className="text-secondary small">No bills registered for this patient.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-borderless table-custom m-0 table-sm text-sm">
                          <thead>
                            <tr>
                              <th>Services</th>
                              <th>Total Amount</th>
                              <th>Payment Status</th>
                              <th>Raised Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedHistory.bills.map((bill) => (
                              <tr key={bill._id}>
                                <td>{bill.services}</td>
                                <td className="fw-bold">${bill.totalAmount.toLocaleString()}</td>
                                <td>
                                  <span className={`badge-status badge-${bill.paymentStatus.toLowerCase()}`}>
                                    {bill.paymentStatus}
                                  </span>
                                </td>
                                <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Lab Documents Tab */}
                {detailTab === 'reports' && (
                  <>
                    <h6 className="text-white fw-bold mb-3">Diagnostic Reports & Lab Documents</h6>
                    {docError && (
                      <div className="alert alert-danger border-0 rounded-3 mb-3 p-2 text-sm d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                        <i className="bi bi-exclamation-triangle-fill"></i>
                        <div>{docError}</div>
                      </div>
                    )}

                    {/* Upload Form */}
                    <div className="p-3 rounded-3 mb-4 bg-dark-subtle" style={{ border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <form onSubmit={handleFileUpload} className="row g-2 align-items-end">
                        <div className="col-12 col-md-5">
                          <label className="form-label text-secondary fw-semibold text-xs mb-1">Report / Document Title</label>
                          <input
                            type="text"
                            className="form-control form-control-sm text-sm"
                            placeholder="e.g. Lab Blood Report"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label text-secondary fw-semibold text-xs mb-1">Select File (PDF, PNG, JPG)</label>
                          <input
                            type="file"
                            id="docFileInput"
                            className="form-control form-control-sm text-sm"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            required
                          />
                        </div>
                        <div className="col-12 col-md-3">
                          <button type="submit" className="btn-primary-grad btn-sm w-100 py-1.5" disabled={uploadingDoc}>
                            {uploadingDoc ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-upload me-1"></i>
                                Upload Report
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Documents List */}
                    {documents.length === 0 ? (
                      <p className="text-secondary small">No diagnostic documents or lab reports uploaded yet.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-borderless table-sm m-0 align-middle">
                          <thead>
                            <tr className="text-secondary text-xs">
                              <th>Document Title</th>
                              <th>Uploaded By</th>
                              <th>Upload Date</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc) => {
                              const isPdf = doc.fileType?.includes('pdf');
                              return (
                                <tr key={doc._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                  <td className="py-2 text-white">
                                    <i className={`bi ${isPdf ? 'bi-file-earmark-pdf-fill text-danger' : 'bi-file-earmark-image-fill text-info'} me-2 fs-5`}></i>
                                    <span className="fw-semibold">{doc.title}</span>
                                  </td>
                                  <td className="text-secondary text-xs">{doc.uploadedBy || 'N/A'}</td>
                                  <td className="text-secondary text-xs">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                  <td className="text-end">
                                    <a 
                                      href={`http://localhost:5000${doc.fileUrl}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="btn btn-outline-info btn-sm me-2 border-0 py-0.5 px-2"
                                      title="View Document"
                                    >
                                      <i className="bi bi-eye-fill"></i>
                                    </a>
                                    <button 
                                      onClick={() => handleFileDelete(doc._id)} 
                                      className="btn btn-outline-danger btn-sm border-0 py-0.5 px-2"
                                      title="Delete Document"
                                    >
                                      <i className="bi bi-trash-fill"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer modal-footer-custom">
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowDetailModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
