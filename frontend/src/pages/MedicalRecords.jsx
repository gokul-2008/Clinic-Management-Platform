import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { downloadPrescriptionPDF } from '../utils/pdfGenerator';

import { API_BASE, STATIC_BASE } from '../config';

export default function MedicalRecords({ toggleMobileSidebar }) {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const role = localStorage.getItem('role');
  const loggedEmail = localStorage.getItem('email');

  // Doctor Availability & Calendar States
  const associatedId = localStorage.getItem('associatedId');
  const [allAppointments, setAllAppointments] = useState([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState([]);
  const [selectedCalendarAppts, setSelectedCalendarAppts] = useState([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'

  const currentDoc = doctors.find(d => d.phone === loggedEmail || d.name.toLowerCase().includes('strange') || d.name.toLowerCase().includes('house') || doctors[0]);
  const resolvedDoctorId = associatedId || currentDoc?._id;
  const doctorAppointments = allAppointments.filter(a => a.doctorId?._id === resolvedDoctorId);

  // Form State
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    vitals: { bloodPressure: '', heartRate: '', weight: '' },
    diagnosis: '',
    notes: '',
    prescriptions: [],
    appointmentId: '' // Optional linked appointment to resolve 'Completed' state
  });

  // Prescription builder state
  const [newMed, setNewMed] = useState({ drugName: '', dosage: '', frequency: 'Once a day', duration: '5 Days' });

  // AI Medical Report Summarizer states
  const [reportInput, setReportInput] = useState('');
  const [summaryResult, setSummaryResult] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  // Available medicines and AI states
  const [availableMeds, setAvailableMeds] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const [recRes, patRes, docRes, apptRes, medRes] = await Promise.all([
        axios.get(`${API_BASE}/records`, getHeaders()),
        axios.get(`${API_BASE}/patients`, getHeaders()),
        axios.get(`${API_BASE}/doctors`, getHeaders()),
        axios.get(`${API_BASE}/appointments`, getHeaders()),
        axios.get(`${API_BASE}/medicines`, getHeaders())
      ]);
      setRecords(recRes.data);
      setPatients(patRes.data);
      setDoctors(docRes.data);
      setAvailableMeds(medRes.data);
      setAllAppointments(apptRes.data);

      // Only show Booked appointments for marking complete
      setAppointments(apptRes.data.filter(a => a.status === 'Booked'));
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch clinical records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAvailabilityModal = () => {
    const currentDocObj = doctors.find(d => d._id === resolvedDoctorId);
    if (!currentDocObj) {
      alert('Doctor profile not found.');
      return;
    }

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const currentAv = currentDocObj.availability || [];

    const initialForm = weekdays.map(day => {
      const existing = currentAv.find(a => a.day === day);
      return {
        day,
        checked: !!existing,
        hours: existing ? existing.hours : '09:00 AM - 05:00 PM'
      };
    });

    setAvailabilityForm(initialForm);
    setShowAvailabilityModal(true);
  };

  const handleAvailabilityToggle = (idx) => {
    const updated = [...availabilityForm];
    updated[idx].checked = !updated[idx].checked;
    setAvailabilityForm(updated);
  };

  const handleAvailabilityHoursChange = (idx, value) => {
    const updated = [...availabilityForm];
    updated[idx].hours = value;
    setAvailabilityForm(updated);
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setSavingAvailability(true);
    try {
      const filteredAvailability = availabilityForm
        .filter(d => d.checked)
        .map(d => ({
          day: d.day,
          hours: d.hours
        }));

      await axios.put(`${API_BASE}/doctors/${resolvedDoctorId}`, {
        availability: filteredAvailability
      }, getHeaders());

      setSuccessMsg('Availability schedule updated successfully.');
      setShowAvailabilityModal(false);
      await fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update availability schedule.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVitalsChange = (e) => {
    setForm({
      ...form,
      vitals: { ...form.vitals, [e.target.name]: e.target.value }
    });
  };

  const addPrescription = () => {
    if (!newMed.drugName || !newMed.dosage) {
      alert('Please fill medication name and dosage.');
      return;
    }
    setForm({
      ...form,
      prescriptions: [...form.prescriptions, newMed]
    });
    setNewMed({ drugName: '', dosage: '', frequency: 'Once a day', duration: '5 Days' });
  };

  const removePrescription = (idx) => {
    setForm({
      ...form,
      prescriptions: form.prescriptions.filter((_, i) => i !== idx)
    });
  };

  const openWriteModal = () => {
    if (patients.length === 0) {
      alert('Please register at least one patient first.');
      return;
    }
    
    // Find doctor profile corresponding to logged doctor user
    const currentDoc = doctors.find(d => d.phone === loggedEmail || d.name.toLowerCase().includes('strange') || d.name.toLowerCase().includes('house') || doctors[0]);
    const defaultDocId = currentDoc?._id || (doctors.length > 0 ? doctors[0]._id : '');

    setForm({
      patientId: patients[0]._id,
      doctorId: defaultDocId,
      vitals: { bloodPressure: '120/80', heartRate: 72, weight: 70 },
      diagnosis: '',
      notes: '',
      prescriptions: [],
      appointmentId: ''
    });
    setEditMode(false);
    setAiResponse(null);
    setShowModal(true);
  };

  const handleConsultAI = async () => {
    if (!form.diagnosis) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/ai/analyze-prescription`, {
        diagnosis: form.diagnosis,
        symptoms: form.notes,
        prescriptions: form.prescriptions
      }, getHeaders());
      setAiResponse(res.data);
    } catch (err) {
      console.error(err);
      setError('AI Assistant failed to generate recommendations.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarizeReport = async (e) => {
    e.preventDefault();
    if (!reportInput.trim()) return;
    setSummarizing(true);
    setSummaryResult(null);
    try {
      const res = await axios.post(`${API_BASE}/ai/summarize-report`, {
        reportText: reportInput
      }, getHeaders());
      setSummaryResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate report summary. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleReportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReportInput(event.target.result);
    };
    reader.readAsText(file);
  };

  const openEditModal = (rec) => {
    setForm({
      patientId: rec.patientId?._id || '',
      doctorId: rec.doctorId?._id || '',
      vitals: {
        bloodPressure: rec.vitals?.bloodPressure || '',
        heartRate: rec.vitals?.heartRate || '',
        weight: rec.vitals?.weight || ''
      },
      diagnosis: rec.diagnosis,
      notes: rec.notes || '',
      prescriptions: rec.prescriptions || [],
      appointmentId: ''
    });
    setCurrentId(rec._id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role !== 'Doctor' && role !== 'Admin') {
      alert('Access Denied: Only attending Doctors or Administrators can modify records.');
      return;
    }

    try {
      if (editMode) {
        await axios.put(`${API_BASE}/records/${currentId}`, form, getHeaders());
        setSuccessMsg('Medical record updated successfully.');
      } else {
        await axios.post(`${API_BASE}/records`, form, getHeaders());
        setSuccessMsg('Medical report and prescription saved successfully.');
      }
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save medical record.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this medical record?')) {
      try {
        await axios.delete(`${API_BASE}/records/${id}`, getHeaders());
        setSuccessMsg('Medical record deleted.');
        fetchData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
        setError('Failed to delete medical record.');
      }
    }
  };

  return (
    <>
      <Navbar title="Clinical Medical Records" toggleMobileSidebar={toggleMobileSidebar} />

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
      <div className="d-flex justify-content-end mb-4 gap-2">
        {role === 'Doctor' && (
          <>
            <button className="btn btn-outline-primary rounded-pill px-4 d-flex align-items-center gap-2" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} onClick={openAvailabilityModal} type="button">
              <i className="bi bi-calendar-range"></i>
              <span>Availability Settings</span>
            </button>
            <button className="btn-primary-grad" onClick={openWriteModal} type="button">
              <i className="bi bi-file-earmark-medical me-2"></i>
              Record Diagnosis & Prescribe
            </button>
          </>
        )}
      </div>

      <div className="row g-4">
        {/* Left Column: Schedule Calendar */}
        {role === 'Doctor' && (
          <div className="col-12 col-lg-4 d-flex flex-column gap-4">
            <div className="glass-card">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-check text-primary"></i>
                  My Schedule
                </h5>
                <div className="btn-group btn-group-sm" role="group">
                  <button 
                    type="button" 
                    className={`btn btn-xs ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '11px' }}
                    onClick={() => setViewMode('calendar')}
                  >
                    Calendar
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-xs ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '11px' }}
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </button>
                </div>
              </div>

              {viewMode === 'calendar' ? (
                <>
                  {selectedCalendarAppts.length > 0 && (
                    <div className="p-3 mb-4 rounded-3 text-secondary text-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-white" style={{ fontSize: '13px' }}>Bookings on {selectedCalendarDate}:</strong>
                        <button className="btn btn-close btn-close-white" style={{ fontSize: '10px' }} onClick={() => setSelectedCalendarAppts([])}></button>
                      </div>
                      <ul className="list-unstyled m-0">
                        {selectedCalendarAppts.map((appt, i) => (
                          <li key={i} className="mb-2 pb-2 border-bottom border-secondary-subtle last-border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span>
                                <i className="bi bi-clock-fill text-primary me-1"></i>
                                <strong>{appt.time}</strong>
                              </span>
                              <span className={`badge-status badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                            </div>
                            <div className="text-xs text-white">
                              Patient: {appt.patientId?.name || 'Unknown'} ({appt.patientId?.age} yrs)
                            </div>
                            <div className="text-xs text-secondary">
                              Phone: {appt.patientId?.phone || 'N/A'}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <DoctorCalendarView 
                    appointments={doctorAppointments} 
                    onSelectDay={(dayAppts, dateStr) => {
                      setSelectedCalendarAppts(dayAppts);
                      setSelectedCalendarDate(dateStr);
                    }} 
                  />
                </>
              ) : doctorAppointments.length === 0 ? (
                <div className="text-center py-4 text-secondary small">
                  No scheduled bookings on file.
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <ul className="list-group list-group-flush bg-transparent">
                    {doctorAppointments.map(appt => (
                      <li key={appt._id} className="list-group-item bg-transparent text-secondary px-0 py-3 d-flex flex-column gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <strong className="text-white">{appt.patientId?.name || 'Unknown Patient'}</strong>
                          <span className={`badge-status badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                        </div>
                        <div className="d-flex justify-content-between text-xs text-secondary">
                          <span>{new Date(appt.date).toLocaleDateString()} at {appt.time}</span>
                          <span>{appt.patientId?.phone}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* AI Medical Report Summarizer Card */}
            <div className="glass-card mt-3">
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-medical text-primary"></i>
                AI Report Summarizer
              </h5>
              <p className="text-secondary small mb-3" style={{ fontSize: '13px' }}>
                Upload a `.txt` clinical report or enter/paste the report text below to generate a structured AI summary.
              </p>

              <form onSubmit={handleSummarizeReport}>
                <div className="mb-3">
                  <label className="form-label text-secondary fw-semibold text-xs mb-1">Upload Report File (.txt)</label>
                  <input 
                    type="file" 
                    className="form-control form-control-sm text-xs bg-dark-subtle text-white" 
                    accept=".txt"
                    onChange={handleReportFileChange}
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary fw-semibold text-xs mb-1">Or Paste Report Text</label>
                  <textarea 
                    className="form-control text-xs" 
                    rows="4" 
                    placeholder="Enter report logs, lab findings, or notes..."
                    value={reportInput}
                    onChange={(e) => setReportInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary-grad btn-sm w-100 py-2" disabled={summarizing}>
                  {summarizing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic me-2"></i>
                      Summarize Report
                    </>
                  )}
                </button>
              </form>

              {summaryResult && (
                <div className="mt-3 pt-3 border-top border-secondary-subtle">
                  <h6 className="text-info fw-bold mb-2 text-xs d-flex align-items-center gap-1">
                    <i className="bi bi-clipboard2-pulse"></i>
                    AI Report Summary
                  </h6>
                  <div className="d-flex flex-column gap-2 text-xs text-secondary" style={{ fontSize: '12px' }}>
                    <div>
                      <strong className="text-white d-block">Key Findings:</strong>
                      <span>{summaryResult.keyFindings}</span>
                    </div>
                    <div>
                      <strong className="text-white d-block">Suspected Diagnosis:</strong>
                      <span className="text-info fw-semibold">{summaryResult.suspectedDiagnosis}</span>
                    </div>
                    <div>
                      <strong className="text-white d-block">Recommended Medications:</strong>
                      <span>{summaryResult.recommendedMedications}</span>
                    </div>
                    <div>
                      <strong className="text-white d-block">Follow-Up Plan:</strong>
                      <span>{summaryResult.followUpPlan}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Records History */}
        <div className={role === 'Doctor' ? "col-12 col-lg-8" : "col-12"}>
          <div className="glass-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-folder2-open fs-1 d-block mb-3"></i>
            No medical records entered yet
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-borderless table-custom m-0">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Diagnosis / Attending Doctor</th>
                  <th>Vitals</th>
                  <th>Prescribed Medications</th>
                  <th>Entry Date</th>
                  {(role === 'Admin' || role === 'Doctor') && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id}>
                    <td className="fw-semibold">
                      {rec.patientId ? (
                        <div>
                          <div className="text-white">{rec.patientId.name}</div>
                          <small className="text-secondary">{rec.patientId.phone}</small>
                        </div>
                      ) : (
                        <span className="text-secondary">Deleted Patient</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <div className="text-info fw-semibold">{rec.diagnosis}</div>
                        <small className="text-secondary">By Dr. {rec.doctorId?.name || 'Unassigned'}</small>
                      </div>
                    </td>
                    <td>
                      <span className="text-dark text-xs fw-medium">
                        BP: {rec.vitals?.bloodPressure || 'N/A'}<br />
                        Pulse: {rec.vitals?.heartRate ? `${rec.vitals.heartRate} bpm` : 'N/A'}<br />
                        Wt: {rec.vitals?.weight ? `${rec.vitals.weight} kg` : 'N/A'}
                      </span>
                    </td>
                    <td>
                      {rec.prescriptions.length === 0 ? (
                        <span className="text-secondary small italic">None</span>
                      ) : (
                        <ul className="m-0 ps-3 text-secondary text-sm">
                          {rec.prescriptions.map((pr, i) => (
                            <li key={i}>
                              <strong className="text-light">{pr.drugName}</strong> - {pr.dosage} ({pr.frequency} / {pr.duration})
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                    {(role === 'Admin' || role === 'Doctor') && (
                      <td className="text-end">
                        {rec.prescriptions && rec.prescriptions.length > 0 && (
                          <button 
                            className="btn btn-outline-success btn-sm me-2 rounded-3 border-0" 
                            onClick={() => downloadPrescriptionPDF(rec)}
                            title="Download Prescription PDF"
                          >
                            <i className="bi bi-file-earmark-arrow-down-fill"></i>
                          </button>
                        )}
                        <button className="btn btn-outline-info btn-sm me-2 rounded-3 border-0" onClick={() => openEditModal(rec)}>
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="btn btn-outline-danger btn-sm rounded-3 border-0" onClick={() => handleDelete(rec._id)}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>

      {/* Record Diagnosis Modal */}
      {showModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100 modal-lg" style={{ maxWidth: '780px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">{editMode ? 'Edit Medical Record' : 'Record Visit Diagnosis & Prescriptions'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="row">
                    {/* Patient Selection */}
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label text-white fw-semibold">Attending Patient</label>
                      <select className="form-select" name="patientId" value={form.patientId} onChange={handleInputChange} required>
                        {patients.map((pat) => (
                          <option key={pat._id} value={pat._id}>{pat.name} ({pat.phone})</option>
                        ))}
                      </select>
                    </div>

                    {/* Attending Doctor */}
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label text-white fw-semibold">Attending Doctor</label>
                      <select className="form-select" name="doctorId" value={form.doctorId} onChange={handleInputChange} required>
                        {doctors.map((doc) => (
                          <option key={doc._id} value={doc._id}>Dr. {doc.name} ({doc.specialty})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    {/* Linked Appointment (Optional) */}
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label text-white fw-semibold">Link Active Appointment (Optional)</label>
                      <select className="form-select" name="appointmentId" value={form.appointmentId} onChange={handleInputChange}>
                        <option value="">-- No Linked Appointment --</option>
                        {appointments
                          .filter(a => a.patientId?._id === form.patientId)
                          .map((a) => (
                            <option key={a._id} value={a._id}>
                              {new Date(a.date).toLocaleDateString()} at {a.time} (Dr. {a.doctorId?.name})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* BP */}
                    <div className="col-4 col-md-2 mb-3">
                      <label className="form-label text-white fw-semibold">Vitals: BP</label>
                      <input type="text" className="form-control" name="bloodPressure" value={form.vitals.bloodPressure} onChange={handleVitalsChange} placeholder="120/80" />
                    </div>
                    {/* Heart Rate */}
                    <div className="col-4 col-md-2 mb-3">
                      <label className="form-label text-white fw-semibold">Pulse (bpm)</label>
                      <input type="number" className="form-control" name="heartRate" value={form.vitals.heartRate} onChange={handleVitalsChange} placeholder="72" />
                    </div>
                    {/* Weight */}
                    <div className="col-4 col-md-2 mb-3">
                      <label className="form-label text-white fw-semibold">Weight (kg)</label>
                      <input type="number" className="form-control" name="weight" value={form.vitals.weight} onChange={handleVitalsChange} placeholder="70" />
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label text-white fw-semibold m-0">Clinical Diagnosis</label>
                      {form.diagnosis && (
                        <button 
                          type="button" 
                          className="btn btn-xs btn-outline-info rounded-pill px-2.5 py-0.5 fw-medium d-flex align-items-center gap-1 border-0"
                          onClick={handleConsultAI}
                          disabled={aiLoading}
                        >
                          {aiLoading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <>✨ Consult CarePulse AI</>
                          )}
                        </button>
                      )}
                    </div>
                    <input type="text" className="form-control" name="diagnosis" value={form.diagnosis} onChange={handleInputChange} required placeholder="e.g. Acute Bronchitis, Migraine Headaches" />
                  </div>

                  {aiResponse && (
                    <div className="glass-card mb-4 p-3 border border-info-subtle rounded-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2) !important' }}>
                      <h6 className="text-info fw-bold mb-2 d-flex align-items-center gap-2">
                        <i className="bi bi-robot"></i>
                        CarePulse AI Recommendations
                      </h6>
                      <div className="text-secondary small mb-2">
                        <strong>Suggestions:</strong> {aiResponse.recommendations}
                      </div>
                      <div className="text-secondary small mb-2">
                        <strong>Warnings:</strong> <span className="text-warning fw-medium">{aiResponse.warnings}</span>
                      </div>
                      <div className="text-secondary small m-0">
                        <strong>Care Plan:</strong> {aiResponse.carePlan}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mb-3">
                    <label className="form-label text-white fw-semibold">Physician Notes / Symptoms</label>
                    <textarea className="form-control" name="notes" value={form.notes} onChange={handleInputChange} rows="2" placeholder="Describe symptoms and follow-up plans..." />
                  </div>

                  {/* Prescriptions Row Builders */}
                  <div className="mt-4 pt-3 border-top border-secondary-subtle">
                    <h6 className="text-white fw-bold mb-3">Prescription Items</h6>

                    {form.prescriptions.length > 0 && (
                      <div className="mb-3">
                        <ul className="list-group">
                          {form.prescriptions.map((pr, idx) => (
                            <li key={idx} className="list-group-item bg-dark border-secondary text-secondary d-flex justify-content-between align-items-center">
                              <div>
                                <strong className="text-white">{pr.drugName}</strong> - {pr.dosage} | {pr.frequency} for {pr.duration}
                              </div>
                              <button type="button" className="btn btn-outline-danger btn-sm border-0" onClick={() => removePrescription(idx)}>
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="row g-2 align-items-end bg-blue p-3 rounded-3 border border-secondary" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <div className="col-12 col-sm-3">
                        <label className="form-label text-white fw-semibold text-xs">Medication Name</label>
                        <select 
                          className="form-select form-select-sm" 
                          value={newMed.drugName} 
                          onChange={(e) => {
                            const selected = availableMeds.find(m => m.name === e.target.value);
                            setNewMed({ ...newMed, drugName: e.target.value, dosage: selected ? `1 ${selected.unit}` : '' });
                          }}
                        >
                          <option value="" style={{ color: 'black' }}>-- Select stock med --</option>
                          {availableMeds.map(m => (
                            <option key={m._id} value={m.name} style={{ color: 'black' }}>
                              {m.name.toUpperCase()} ({m.stock} {m.unit} left)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-sm-3">
                        <label className="form-label text-white fw-semibold text-xs">Dosage</label>
                        <input type="text" className="form-control form-control-sm" value={newMed.dosage} onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} placeholder="e.g. 1 tablet" />
                      </div>
                      <div className="col-6 col-sm-3">
                        <label className="form-label text-white fw-semibold text-xs">Frequency</label>
                        <select className="form-select form-select-sm text-dark" value={newMed.frequency} onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}>
                          <option value="Once a day" className='text-dark' style={{ color: 'black' }}>Once a day</option>
                          <option value="Twice a day" className='text-dark' style={{ color: 'black' }}>Twice a day</option>
                          <option value="Thrice a day" className='text-dark' style={{ color: 'black' }}>Thrice a day</option>
                          <option value="Every 4 Hours" className='text-dark' style={{ color: 'black' }}>Every 4 Hours</option>
                          <option value="As Needed" className='text-dark' style={{ color: 'black' }}>As Needed (PRN)</option>
                        </select>
                      </div>
                      <div className="col-6 col-sm-2">
                        <label className="form-label text-white fw-semibold text-xs">Duration</label>
                        <input type="text" className="form-control form-control-sm" value={newMed.duration} onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })} placeholder="e.g. 5 Days" />
                      </div>
                      <div className="col-12 col-sm-1 text-center">
                        <button type="button" className="btn btn-primary btn-sm w-100 py-1.5 rounded-3" onClick={addPrescription}>
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary-grad">{editMode ? 'Update Record' : 'Submit Record'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Availability Settings Modal */}
      {showAvailabilityModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '500px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">📅 Set My Availability</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAvailabilityModal(false)}></button>
              </div>
              <form onSubmit={handleSaveAvailability}>
                <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <p className="text-secondary small mb-3">
                    Configure your weekly available working days and shift hours for patients to self-book appointments.
                  </p>
                  {availabilityForm.map((dayObj, idx) => (
                    <div key={dayObj.day} className="d-flex align-items-center gap-3 py-2 border-bottom border-secondary-subtle" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                      <div className="form-check form-switch m-0" style={{ minWidth: '130px' }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`chk-${dayObj.day}`}
                          checked={dayObj.checked}
                          onChange={() => handleAvailabilityToggle(idx)}
                        />
                        <label className="form-check-label text-white fw-medium text-sm" htmlFor={`chk-${dayObj.day}`}>
                          {dayObj.day}
                        </label>
                      </div>
                      <div className="flex-grow-1">
                        <input
                          type="text"
                          className="form-control form-control-sm text-sm"
                          placeholder="e.g. 09:00 AM - 05:00 PM"
                          value={dayObj.hours}
                          onChange={(e) => handleAvailabilityHoursChange(idx, e.target.value)}
                          disabled={!dayObj.checked}
                          required={dayObj.checked}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowAvailabilityModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-grad" disabled={savingAvailability}>
                    {savingAvailability ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : (
                      'Save Availability'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const DoctorCalendarView = ({ appointments, onSelectDay }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  return (
    <div className="p-3 bg-dark-subtle rounded-3" style={{ border: '1px solid rgba(255,255,255,0.03)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="text-white fw-bold m-0 text-sm">
          <i className="bi bi-calendar3 text-primary me-2"></i>
          {monthNames[month]} {year}
        </h6>
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-outline-secondary btn-xs py-0.5 px-2" onClick={handlePrevMonth}>
            <i className="bi bi-chevron-left" style={{ fontSize: '10px' }}></i>
          </button>
          <button type="button" className="btn btn-outline-secondary btn-xs py-0.5 px-2" onClick={handleNextMonth}>
            <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
          </button>
        </div>
      </div>

      <div className="text-center text-secondary fw-semibold mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: '10px' }}>
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} style={{ minHeight: '40px' }}></div>;
          }

          const dateStr = day.toDateString();
          const dayAppts = appointments.filter(a => {
            const apptDate = new Date(a.date);
            return apptDate.toDateString() === dateStr && a.status !== 'Cancelled';
          });

          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <button 
              key={`day-${day.getDate()}`} 
              type="button"
              className={`p-1 rounded-3 d-flex flex-column justify-content-between align-items-center border-0`}
              style={{ 
                minHeight: '42px', 
                backgroundColor: dayAppts.length > 0 
                  ? 'rgba(59, 130, 246, 0.15)' 
                  : isToday
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.02)',
                border: isToday ? '1px solid var(--accent-color) !important' : 'none',
                cursor: dayAppts.length > 0 ? 'pointer' : 'default',
                color: dayAppts.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
              onClick={() => dayAppts.length > 0 && onSelectDay(dayAppts, day.toLocaleDateString())}
              disabled={dayAppts.length === 0}
            >
              <span className="fw-bold" style={{ fontSize: '10px' }}>{day.getDate()}</span>
              {dayAppts.length > 0 && (
                <span className="rounded-circle bg-primary" style={{ width: '4px', height: '4px' }}></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
