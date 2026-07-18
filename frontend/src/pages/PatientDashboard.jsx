import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { downloadPrescriptionPDF } from '../utils/pdfGenerator';

import { API_BASE, STATIC_BASE } from '../config';

export default function PatientDashboard({ toggleMobileSidebar }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const patientId = localStorage.getItem('associatedId');
  const token = localStorage.getItem('token');

  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Patient document upload states
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docError, setDocError] = useState('');

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    patientId: '',
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: ''
  });

  // Doctor Availability & Slots States
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotWarning, setSlotWarning] = useState('');
  const [selectedCalendarAppts, setSelectedCalendarAppts] = useState([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'


  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    date: '',
    time: ''
  });

  // Timeline Filters and Tab States
  const [timelineTab, setTimelineTab] = useState('timeline'); // 'timeline', 'visits', 'appointments', 'billing', 'reports', 'symptom-checker', 'chatbot'
  const [timelineStartDate, setTimelineStartDate] = useState('');
  const [timelineEndDate, setTimelineEndDate] = useState('');
  const [timelineDoctorFilter, setTimelineDoctorFilter] = useState('');

  // AI Symptom Checker & Chatbot States
  const [symptomsInput, setSymptomsInput] = useState('');
  const [symptomCheckResult, setSymptomCheckResult] = useState(null);
  const [symptomChecking, setSymptomChecking] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your CarePulse Virtual Receptionist. How can I help you today? You can ask about our clinic hours, services, available specialists, or booking appointments.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Helper to extract unique doctors from records/appointments
  const getTimelineDoctors = () => {
    const docIds = new Set();
    const uniqueDocs = [];
    [...records, ...appointments].forEach(item => {
      const doc = item.doctorId;
      if (doc && doc._id && !docIds.has(doc._id)) {
        docIds.add(doc._id);
        uniqueDocs.push(doc);
      }
    });
    return uniqueDocs;
  };

  // Helper to build consolidated timeline events
  const getTimelineEvents = () => {
    const events = [];

    // 1. Medical Records / Prescriptions
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
        title: `Appointment Booked`,
        subtitle: `Physician: Dr. ${appt.doctorId?.name || 'Physician'} (${appt.doctorId?.specialty || 'General'})`,
        color: '#3b82f6', // blue
        icon: 'bi-calendar-check text-blue',
        data: appt
      });
    });

    // 3. Lab Reports / Documents
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
        color: '#f59e0b', // amber / gold
        icon: 'bi-credit-card text-amber',
        data: bill
      });
    });

    // Sort chronologically descending
    const sorted = events.sort((a, b) => b.date - a.date);

    // Apply filtering
    return sorted.filter(e => {
      // Doctor filtering
      if (timelineDoctorFilter) {
        if (e.type === 'Prescription' && e.data.doctorId?._id !== timelineDoctorFilter) return false;
        if (e.type === 'Appointment' && e.data.doctorId?._id !== timelineDoctorFilter) return false;
        // Exclude unrelated items when filtering by doctor
        if (e.type === 'LabReport' || e.type === 'Billing') return false;
      }

      // Date Range filtering
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

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleCheckSymptoms = async (e) => {
    e.preventDefault();
    if (!symptomsInput.trim()) return;
    setSymptomChecking(true);
    setSymptomCheckResult(null);
    try {
      const res = await axios.post(`${API_BASE}/ai/check-symptoms`, {
        symptoms: symptomsInput
      }, getHeaders());
      setSymptomCheckResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to analyze symptoms. Please try again.');
    } finally {
      setSymptomChecking(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/ai/chatbot`, {
        message: userMsg.text,
        history: chatMessages.slice(-10) // last 10 messages for context
      }, getHeaders());
      
      setChatMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I am having trouble connecting to the CarePulse server right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const loadData = async () => {
    if (!patientId) {
      setError('Patient profile not linked. Please configure your account details.');
      setLoading(false);
      return;
    }
    try {
      let patientProfile;
      try {
        const patientProfileRes = await axios.get(`${API_BASE}/patients/${patientId}`, getHeaders());
        patientProfile = patientProfileRes.data;
      } catch (patErr) {
        if (patErr.response?.status === 404) {
          setError('Your patient clinical record has been deleted or is unlinked. Please contact support.');
          setPatient(null);
          setLoading(false);
          return;
        }
        throw patErr;
      }

      const [recordLogs, billLogs, doctorList, docLogs] = await Promise.all([
        axios.get(`${API_BASE}/records/patient/${patientId}`, getHeaders()),
        axios.get(`${API_BASE}/billing`, getHeaders()), // We will filter patient-specific bills on the client
        axios.get(`${API_BASE}/doctors`, getHeaders()),
        axios.get(`${API_BASE}/documents/patient/${patientId}`, getHeaders())
      ]);

      setPatient(patientProfile.patient);
      setAppointments(patientProfile.appointments);
      setRecords(recordLogs.data);
      setBills(billLogs.data.filter(b => b.patientId?._id === patientId));
      setDoctors(doctorList.data);
      setDocuments(docLogs.data);

      if (doctorList.data.length > 0) {
        setBookingForm(prev => ({ ...prev, doctorId: doctorList.data[0]._id }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load portal data.');
    } finally {
      setLoading(false);
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
      formData.append('patientId', patientId);
      formData.append('title', docTitle);

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      await axios.post(`${API_BASE}/documents/upload`, formData, config);
      setSuccessMsg('Document uploaded successfully.');
      setDocTitle('');
      setSelectedFile(null);
      
      // Clear file input
      const fileInput = document.getElementById('patientDocFileInput');
      if (fileInput) fileInput.value = '';

      // Refresh documents
      const docRes = await axios.get(`${API_BASE}/documents/patient/${patientId}`, getHeaders());
      setDocuments(docRes.data);
      setTimeout(() => setSuccessMsg(''), 4000);
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
      setSuccessMsg('Document deleted successfully.');
      
      // Refresh documents
      const docRes = await axios.get(`${API_BASE}/documents/patient/${patientId}`, getHeaders());
      setDocuments(docRes.data);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete document.');
    }
  };

  const openEditProfileModal = () => {
    if (!patient) return;
    setEditForm({
      patientId: patient.patientId || '',
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address
    });
    setDocError('');
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.phone || !editForm.address || !editForm.age) {
      alert('All fields are required.');
      return;
    }
    setSavingProfile(true);
    try {
      const payload = {
        name: editForm.name,
        age: Number(editForm.age),
        gender: editForm.gender,
        phone: editForm.phone,
        address: editForm.address
      };
      await axios.put(`${API_BASE}/patients/${patientId}`, payload, getHeaders());
      setSuccessMsg('Your profile has been updated successfully.');
      setShowEditModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    // 1. Process Stripe Success Redirect Check
    const sessionId = searchParams.get('checkout_session');
    const billId = searchParams.get('bill_id');

    const checkPaymentConfirmation = async () => {
      if (sessionId && billId) {
        try {
          await axios.post(`${API_BASE}/payments/confirm/${billId}`, {}, getHeaders());
          setSuccessMsg('Payment received successfully! Your invoice is marked as Paid.');
          // Remove query params from URL
          setSearchParams({});
        } catch (err) {
          console.error(err);
          setError('Failed to confirm invoice payment.');
        }
      }
      loadData();
    };

    checkPaymentConfirmation();
  }, [searchParams]);

  const handleBookingChange = (e) => {
    setBookingForm({ ...bookingForm, [e.target.name]: e.target.value });
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patientId,
        doctorId: bookingForm.doctorId,
        date: bookingForm.date,
        time: bookingForm.time,
        status: 'Booked'
      };
      await axios.post(`${API_BASE}/appointments`, payload, getHeaders());
      setSuccessMsg('Appointment scheduled successfully!');
      setBookingForm(prev => ({ ...prev, date: '', time: '' }));
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to book appointment.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handlePayInvoice = async (billId) => {
    try {
      const res = await axios.post(`${API_BASE}/payments/checkout-session/${billId}`, {}, getHeaders());
      if (res.data.url) {
        // Redirect client to Stripe Checkout page
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
      setError('Stripe Checkout session initialization failed.');
    }
  };

  const generateSlotsFromHours = (hoursString) => {
    const defaultSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    if (!hoursString) return defaultSlots;
    try {
      const [startStr, endStr] = hoursString.split('-').map(s => s.trim());
      const parseTime = (str) => {
        const [time, modifier] = str.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      const startMin = parseTime(startStr);
      const endMin = parseTime(endStr);
      
      const slots = [];
      for (let min = startMin; min < endMin; min += 60) {
        const h24 = Math.floor(min / 60);
        const m = min % 60;
        const modifier = h24 >= 12 ? 'PM' : 'AM';
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;
        const pad = (val) => String(val).padStart(2, '0');
        slots.push(`${pad(h12)}:${pad(m)} ${modifier}`);
      }
      return slots.length > 0 ? slots : defaultSlots;
    } catch (e) {
      console.error(e);
      return defaultSlots;
    }
  };

  const fetchAvailableSlots = async (docId, bookingDate) => {
    if (!docId || !bookingDate) {
      setAvailableSlots([]);
      setSlotWarning('');
      return;
    }
    
    const selectedDoc = doctors.find(d => d._id === docId);
    if (!selectedDoc) return;

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = new Date(bookingDate);
    const selectedDay = weekdays[dateObj.getDay()];

    const avConfig = selectedDoc.availability?.find(a => a.day === selectedDay);
    if (!avConfig) {
      setAvailableSlots([]);
      setSlotWarning(`Dr. ${selectedDoc.name} is not available on ${selectedDay}s.`);
      return;
    }

    setSlotWarning('');
    try {
      const res = await axios.get(`${API_BASE}/appointments/booked-slots?doctorId=${docId}&date=${bookingDate}`, getHeaders());
      setBookedSlots(res.data);
      const allSlots = generateSlotsFromHours(avConfig.hours);
      setAvailableSlots(allSlots);
    } catch (err) {
      console.error(err);
      setAvailableSlots([]);
    }
  };

  useEffect(() => {
    fetchAvailableSlots(bookingForm.doctorId, bookingForm.date);
  }, [bookingForm.doctorId, bookingForm.date, doctors]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 text-white">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar title="My Patient Portal" toggleMobileSidebar={toggleMobileSidebar} />

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

      <div className="row g-4">
        {/* Profile Details & Booking Column */}
        <div className="col-12 col-lg-4 d-flex flex-column gap-4">
          
          {/* Profile Card */}
          <div className="glass-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                <i className="bi bi-person-fill text-primary"></i>
                My Profile Info
              </h5>
              {patient && (
                <button 
                  className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                  style={{ fontSize: '13px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  onClick={openEditProfileModal}
                  type="button"
                >
                  <span>✏️ Edit</span>
                </button>
              )}
            </div>
            {patient ? (
              <div className="text-secondary small">
                <div className="mb-2"><strong className="text-white">Patient ID:</strong> {patient.patientId || 'N/A'}</div>
                <div className="mb-2"><strong className="text-white">Name:</strong> {patient.name}</div>
                <div className="mb-2"><strong className="text-white">Age / Gender:</strong> {patient.age} yrs, {patient.gender}</div>
                <div className="mb-2"><strong className="text-white">Phone:</strong> {patient.phone}</div>
                <div><strong className="text-white">Address:</strong> {patient.address}</div>
              </div>
            ) : (
              <p className="text-secondary small m-0">No linked clinical profile detected.</p>
            )}
          </div>

          {/* Book Appointment Form */}
          <div className="glass-card">
            <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-calendar-plus text-primary"></i>
              Schedule Consultation
            </h5>
            <form onSubmit={handleBookAppointment}>
              <div className="mb-3">
                <label className="text-white form-label text-secondary fw-semibold text-xs">Attending Physician</label>
                <select 
                  className="form-select" 
                  name="doctorId" 
                  value={bookingForm.doctorId}
                  onChange={handleBookingChange}
                  required
                >
                  {doctors.map(d => (
                    <option key={d._id} value={d._id}>Dr. {d.name} ({d.specialty}) - ${d.consultationFee}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="text-white form-label text-secondary fw-semibold text-xs">Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  name="date"
                  value={bookingForm.date}
                  onChange={handleBookingChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="text-white form-label text-secondary fw-semibold text-xs mb-2">Available Time Slots</label>
                
                {slotWarning && (
                  <div className="text-warning small mb-2">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {slotWarning}
                  </div>
                )}

                {availableSlots.length === 0 && !slotWarning && (
                  <div className="text-white text-secondary small italic mb-2">
                    Please select a doctor and consultation date to view slots.
                  </div>
                )}

                {availableSlots.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mb-2" style={{ maxHeight: '160px', overflowY: 'auto', padding: '2px' }}>
                    {availableSlots.map((slot, index) => {
                      const isBooked = bookedSlots.includes(slot);
                      const isSelected = bookingForm.time === slot;

                      return (
                        <button
                          key={index}
                          type="button"
                          className={`btn btn-sm rounded-3 py-1.5 px-2.5 text-xs fw-semibold ${
                            isBooked 
                              ? 'btn-dark text-decoration-line-through text-muted border border-secondary-subtle opacity-50' 
                              : isSelected
                                ? 'btn-primary shadow'
                                : 'btn-outline-secondary'
                          }`}
                          style={{ minWidth: '75px', pointerEvents: isBooked ? 'none' : 'auto' }}
                          disabled={isBooked}
                          onClick={() => setBookingForm(prev => ({ ...prev, time: slot }))}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary-grad w-100 py-2">
                Book Session
              </button>
            </form>
          </div>
        </div>

        {/* Clinical History & Bills Column */}
        <div className="col-12 col-lg-8 d-flex flex-column gap-4">
          
          {/* Navigation Tabs */}
          <div className="d-flex flex-wrap gap-2 border-bottom border-secondary-subtle pb-3">
            <button
              onClick={() => setTimelineTab('timeline')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'timeline' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-clock-history"></i>
              <span>Chronological Timeline</span>
            </button>
            <button
              onClick={() => setTimelineTab('visits')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'visits' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-prescription2"></i>
              <span>Medical Visits & Rx</span>
            </button>
            <button
              onClick={() => setTimelineTab('appointments')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'appointments' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-calendar-check"></i>
              <span>Appointments Booked</span>
            </button>
            <button
              onClick={() => setTimelineTab('billing')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'billing' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-credit-card"></i>
              <span>Invoices & Payments</span>
            </button>
            <button
              onClick={() => setTimelineTab('reports')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'reports' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-file-earmark-medical"></i>
              <span>Diagnostic Reports</span>
            </button>
            <button
              onClick={() => setTimelineTab('symptom-checker')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'symptom-checker' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-heart-pulse"></i>
              <span>AI Symptom Checker</span>
            </button>
            <button
              onClick={() => setTimelineTab('chatbot')}
              type="button"
              className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${
                timelineTab === 'chatbot' ? 'btn-primary shadow' : 'btn-outline-secondary'
              }`}
            >
              <i className="bi bi-robot"></i>
              <span>Healthcare Assistant</span>
            </button>
          </div>

          {/* Timeline Tab */}
          {timelineTab === 'timeline' && (
            <>
              {/* Filter Panel */}
              <div className="glass-card p-3">
                <h6 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-filter text-primary"></i>
                  Filter Clinical Timeline
                </h6>
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label text-secondary fw-semibold text-xs mb-1">Attending Physician</label>
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
                  <div className="col-12 col-md-2 d-flex align-items-end">
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

              {/* Timeline Journey */}
              <div className="glass-card">
                <h5 className="text-white fw-bold mb-4 d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-primary"></i>
                  Clinical Journey Timeline
                </h5>
                
                {timelineEvents.length === 0 ? (
                  <div className="text-center py-5 text-secondary small">
                    <i className="bi bi-calendar-x fs-1 d-block mb-2 text-muted"></i>
                    No clinical journey records match the selected filters.
                  </div>
                ) : (
                  <div className="timeline-container ps-4 position-relative" style={{ borderLeft: '2px solid rgba(255, 255, 255, 0.08)', marginLeft: '10px' }}>
                    {timelineEvents.map((evt) => (
                      <div key={evt.id} className="timeline-event position-relative mb-4 pb-2" style={{ paddingLeft: '15px' }}>
                        {/* Dot on line */}
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
                        
                        {/* Event Body */}
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

                          {/* Event details custom widgets */}
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
                                Schedule Slot: <strong>{evt.data.time}</strong>
                              </span>
                              <span className={`badge-status badge-${evt.data.status.toLowerCase()}`}>{evt.data.status}</span>
                            </div>
                          )}

                          {evt.type === 'LabReport' && (
                            <div className="mt-2 d-flex justify-content-end gap-2">
                              <a 
                                href={`${STATIC_BASE}${evt.data.fileUrl}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-outline-info btn-sm py-1 px-2.5 rounded-pill d-flex align-items-center gap-1"
                                style={{ fontSize: '11px' }}
                              >
                                <i className="bi bi-eye-fill"></i>
                                <span>View Report</span>
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
                              {evt.data.paymentStatus === 'Unpaid' ? (
                                <button 
                                  className="btn btn-outline-success btn-sm py-1 px-3 rounded-pill fw-bold"
                                  onClick={() => handlePayInvoice(evt.data._id)}
                                >
                                  <i className="bi bi-wallet2 me-1.5"></i>Pay Invoice
                                </button>
                              ) : (
                                <span className="text-success fw-semibold"><i className="bi bi-patch-check-fill me-1"></i>Settled</span>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Medical Visits & RX Tab */}
          {timelineTab === 'visits' && (
            <div className="glass-card">
              <h5 className="text-white fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-clock-history text-primary"></i>
                My Medical Visit History
              </h5>
              {records.length === 0 ? (
                <div className="text-center py-4 text-secondary small">
                  No past visit diagnoses recorded.
                </div>
              ) : (
                records.map(rec => (
                  <div key={rec._id} className="pb-3 mb-3 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="d-flex justify-content-between align-items-center text-xs text-secondary mb-2">
                      <div>
                        <span>Date: {new Date(rec.createdAt).toLocaleDateString()}</span>
                        <span className="mx-2">|</span>
                        <span>Physician: Dr. {rec.doctorId?.name} ({rec.doctorId?.specialty})</span>
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
                    <div className="mb-2"><strong className="text-white">Diagnosis:</strong> <span className="text-secondary">{rec.diagnosis}</span></div>
                    {rec.notes && <div className="mb-2 text-sm text-secondary italic">"{rec.notes}"</div>}
                    {rec.prescriptions && rec.prescriptions.length > 0 && (
                      <div className="p-2 rounded bg-dark" style={{ border: '1px solid rgba(255,255,255,0.02)' }}>
                        <small className="text-light fw-medium d-block mb-1">Prescribed Meds:</small>
                        <ul className="m-0 ps-3 text-secondary text-sm">
                          {rec.prescriptions.map((pr, i) => (
                            <li key={i}>{pr.drugName} - {pr.dosage} ({pr.frequency} for {pr.duration})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {timelineTab === 'appointments' && (
            <div className="glass-card">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-check text-primary"></i>
                  My Appointment bookings
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
                          <li key={i} className="mb-2 d-flex justify-content-between align-items-center">
                            <span>
                              <i className="bi bi-clock-fill text-primary me-1"></i>
                              <strong>{appt.time}</strong> with Dr. {appt.doctorId?.name || 'Physician'}
                            </span>
                            <span className={`badge-status badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <CalendarView 
                    appointments={appointments} 
                    onSelectDay={(dayAppts, dateStr) => {
                      setSelectedCalendarAppts(dayAppts);
                      setSelectedCalendarDate(dateStr);
                    }} 
                  />
                </>
              ) : appointments.length === 0 ? (
                <div className="text-center py-4 text-secondary small">
                  No scheduled bookings on file.
                </div>
              ) : (
                <ul className="list-group list-group-flush bg-transparent">
                  {appointments.map(appt => (
                    <li key={appt._id} className="list-group-item bg-transparent text-secondary px-0 py-3 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <strong className="text-white">Dr. {appt.doctorId?.name || 'Unassigned'}</strong>
                        <span className="mx-2 text-muted">|</span>
                        <span className="text-xs">{new Date(appt.date).toLocaleDateString()} at {appt.time}</span>
                      </div>
                      <span className={`badge-status badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {timelineTab === 'billing' && (
            <div className="glass-card">
              <h5 className="text-white fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-credit-card text-primary"></i>
                My Invoices & Payments
              </h5>
              {bills.length === 0 ? (
                <div className="text-center py-4 text-secondary small">
                  No invoices found on record.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-borderless table-custom m-0">
                    <thead>
                      <tr>
                        <th>Services</th>
                        <th>Total Due</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map(bill => (
                        <tr key={bill._id}>
                          <td>{bill.services}</td>
                          <td className="fw-bold">${bill.totalAmount.toLocaleString()}</td>
                          <td>
                            <span className={`badge-status badge-${bill.paymentStatus.toLowerCase()}`}>
                              {bill.paymentStatus}
                            </span>
                          </td>
                          <td className="text-end">
                            {bill.paymentStatus === 'Unpaid' ? (
                              <button 
                                className="btn btn-outline-success btn-sm rounded-3 py-1 px-3 fw-bold"
                                onClick={() => handlePayInvoice(bill._id)}
                              >
                                <i className="bi bi-wallet2 me-2"></i>Pay Now
                              </button>
                            ) : (
                              <span className="text-success small fw-semibold"><i className="bi bi-patch-check-fill me-1"></i>Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {timelineTab === 'reports' && (
            <div className="glass-card">
              <h5 className="text-white fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-medical text-primary"></i>
                My Lab Reports & Diagnostic Documents
              </h5>

              {docError && (
                <div className="alert alert-danger border-0 rounded-3 mb-3 p-2 text-sm d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <div>{docError}</div>
                </div>
              )}

              {/* Document upload form for Patient */}
              <div className="p-3 rounded-3 mb-4 bg-dark-subtle" style={{ border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <form onSubmit={handleFileUpload} className="row g-2 align-items-end">
                  <div className="col-12 col-md-5">
                    <label className="text-dark form-label text-secondary fw-semibold text-xs mb-1">Document Title</label>
                    <input
                      type="text"
                      style={{ color: '#161515', backgroundColor: '#212529', border: '#495057 1px solid' }}
                      className="form-control form-control-sm text-sm"
                      placeholder="e.g. Blood Work / MRI Scan"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="text-dark form-label text-secondary fw-semibold text-xs mb-1">Select File (PDF, PNG, JPG)</label>
                    <input
                      type="file"
                      style={{ color: '#161515', backgroundColor: '#212529', border: '#495057 1px solid' }}
                      id="patientDocFileInput"
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

              {documents.length === 0 ? (
                <div className="text-center py-4 text-secondary small">
                  No diagnostic reports or documents uploaded yet.
                </div>
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
                                href={`${STATIC_BASE}${doc.fileUrl}`} 
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
            </div>
          )}

          {/* AI Symptom Checker Tab */}
          {timelineTab === 'symptom-checker' && (
            <div className="glass-card">
              <h5 className="text-white fw-bold mb-4 d-flex align-items-center gap-2">
                <i className="bi bi-heart-pulse text-primary"></i>
                AI Symptom Checker
              </h5>
              
              <div className="alert alert-info border-0 rounded-3 mb-4 p-3 d-flex align-items-start gap-2" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                <i className="bi bi-info-circle-fill fs-5 mt-0.5"></i>
                <div>
                  <strong className="d-block mb-1">Disclaimer & Warning</strong>
                  <span className="text-sm">
                    This symptom checker provides informational guidance based on AI analysis and does not constitute formal medical diagnosis, treatment, or advice. Always consult a qualified medical professional for health concerns. In case of emergency, immediately contact emergency services.
                  </span>
                </div>
              </div>

              <form onSubmit={handleCheckSymptoms} className="mb-4">
                <div className="mb-3">
                  <label className="form-label text-secondary fw-semibold">Describe Your Symptoms</label>
                  <textarea 
                    className="form-control"
                    rows="4"
                    placeholder="e.g. I have a dry cough, low-grade fever of 100°F, and mild body aches for the last two days..."
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary-grad" disabled={symptomChecking}>
                  {symptomChecking ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Analyzing Symptoms...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic me-2"></i>
                      Analyze Symptoms
                    </>
                  )}
                </button>
              </form>

              {symptomCheckResult && (
                <div className="mt-4 pt-4 border-top border-secondary-subtle">
                  <h6 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-clipboard2-pulse text-primary"></i>
                    AI Analysis Results
                  </h6>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <div className="p-3 rounded-3 h-100" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <span className="text-secondary small d-block mb-1">Urgency Level</span>
                        <span className={`badge-status badge-${symptomCheckResult.urgency?.toLowerCase() || 'booked'} fs-6 py-1 px-3`}>
                          {symptomCheckResult.urgency || 'Normal'}
                        </span>
                      </div>
                    </div>
                    <div className="col-12 col-md-8">
                      <div className="p-3 rounded-3 h-100" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <span className="text-secondary small d-block mb-1">Recommended Specialist / Department</span>
                        <strong className="text-white fs-5">{symptomCheckResult.recommendedDepartment || 'General Physician'}</strong>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="p-3 rounded-3" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <span className="text-secondary small d-block mb-2">Possible Conditions Highlighted</span>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {symptomCheckResult.possibleConditions?.map((cond, idx) => (
                            <span key={idx} className="badge bg-secondary text-dark rounded-pill px-3 py-1.5 fw-medium">
                              {cond}
                            </span>
                          ))}
                        </div>
                        <span className="text-secondary small d-block mb-1">Triage Details</span>
                        <p className="m-0 text-sm text-secondary">{symptomCheckResult.explanation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Healthcare Chatbot Tab */}
          {timelineTab === 'chatbot' && (
            <div className="glass-card d-flex flex-column" style={{ height: '550px' }}>
              <div className="border-bottom border-secondary-subtle pb-3 mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-robot text-primary fs-4"></i>
                <div>
                  <h5 className="text-white fw-bold m-0">CarePulse Virtual Assistant</h5>
                  <small className="text-secondary">AI reception assistant & general guide</small>
                </div>
              </div>

              {/* Chat messages viewport */}
              <div className="flex-grow-1 overflow-auto mb-3 p-2 d-flex flex-column gap-3" style={{ maxHeight: '350px', minHeight: '260px' }}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div 
                      className={`p-3 rounded-3 text-sm max-w-75 ${
                        msg.sender === 'user' 
                          ? 'btn-primary-grad text-white rounded-bottom-end-0' 
                          : 'rounded-bottom-start-0'
                      }`}
                      style={msg.sender !== 'user' ? { 
                        border: '1px solid var(--border-color)', 
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      } : {}}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="d-flex justify-content-start">
                    <div 
                      className="p-3 rounded-3 text-sm d-flex align-items-center gap-2" 
                      style={{ 
                        border: '1px solid var(--border-color)', 
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></span>
                      Assistant is typing...
                    </div>
                  </div>
                )}
              </div>

              {/* Input section */}
              <form onSubmit={handleSendChatMessage} className="mt-auto border-top border-secondary-subtle pt-3">
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Ask about clinic hours, booking assistance, services..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    required
                  />
                  <button type="submit" className="btn-primary-grad px-4" disabled={chatLoading}>
                    <i className="bi bi-send-fill"></i>
                  </button>
                </div>
              </form>
            </div>
          )}
          </div>

        </div>
      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '500px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">✏️ Edit My Profile</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleUpdateProfile}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Patient ID (Read-only)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.patientId || "N/A"}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditInputChange}
                      required
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="row">
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Age</label>
                      <input
                        type="number"
                        className="form-control"
                        name="age"
                        value={editForm.age}
                        onChange={handleEditInputChange}
                        required
                        min="0"
                        placeholder="e.g. 30"
                      />
                    </div>
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Gender</label>
                      <select 
                        className="form-select" 
                        name="gender" 
                        value={editForm.gender} 
                        onChange={handleEditInputChange}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditInputChange}
                      required
                      placeholder="e.g. 1234567890"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary fw-semibold">Address</label>
                    <textarea
                      className="form-control"
                      name="address"
                      value={editForm.address}
                      onChange={handleEditInputChange}
                      required
                      rows="3"
                      placeholder="e.g. 123 Street Name, City"
                    />
                  </div>
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-grad" disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
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

const CalendarView = ({ appointments, onSelectDay }) => {
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
