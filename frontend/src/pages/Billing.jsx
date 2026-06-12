import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_BASE = 'http://localhost:5000/api';

export default function Billing({ toggleMobileSidebar }) {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const role = localStorage.getItem('role');

  // Form State
  const [form, setForm] = useState({
    patientId: '',
    services: '',
    totalAmount: '',
    paymentStatus: 'Unpaid'
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const [billingRes, patientRes] = await Promise.all([
        axios.get(`${API_BASE}/billing`, getHeaders()),
        axios.get(`${API_BASE}/patients`, getHeaders())
      ]);
      setBills(billingRes.data);
      setPatients(patientRes.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch billing logs.');
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
    setForm({
      patientId: patients[0]._id,
      services: '',
      totalAmount: '',
      paymentStatus: 'Unpaid'
    });
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (bill) => {
    setForm({
      patientId: bill.patientId?._id || '',
      services: bill.services,
      totalAmount: bill.totalAmount,
      paymentStatus: bill.paymentStatus
    });
    setCurrentId(bill._id);
    setEditMode(true);
    setShowModal(true);
  };

  const openPrintPreview = (bill) => {
    setSelectedBill(bill);
    setShowPrintModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`${API_BASE}/billing/${currentId}`, form, getHeaders());
        setSuccessMsg('Invoice details updated.');
      } else {
        await axios.post(`${API_BASE}/billing`, form, getHeaders());
        setSuccessMsg('Invoice generated successfully.');
      }
      setShowModal(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to write invoice records.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this billing invoice permanently?')) {
      try {
        await axios.delete(`${API_BASE}/billing/${id}`, getHeaders());
        setSuccessMsg('Invoice purged.');
        fetchData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
        setError('Failed to delete billing logs.');
      }
    }
  };

  const togglePaymentStatus = async (bill) => {
    const nextStatus = bill.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      await axios.put(`${API_BASE}/billing/${bill._id}`, { paymentStatus: nextStatus }, getHeaders());
      setSuccessMsg(`Invoice status updated to ${nextStatus}.`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update status.');
    }
  };

  const filteredBills = bills.filter((b) => {
    if (statusFilter === 'All') return true;
    return b.paymentStatus === statusFilter;
  });

  return (
    <>
      <Navbar title="Billing & Invoicing" toggleMobileSidebar={toggleMobileSidebar} />

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
          {['All', 'Paid', 'Unpaid'].map((status) => (
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
        {role === 'Admin' && (
          <button className="btn-primary-grad" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-2"></i>
            Create Invoice
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-receipt-cutoff fs-1 d-block mb-3"></i>
            No invoices registered
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-borderless table-custom m-0">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Services Performed</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  {role === 'Admin' && <th>Quick Action</th>}
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr key={bill._id}>
                    <td className="fw-semibold">
                      {bill.patientId ? (
                        <div>
                          <div className="text-white">{bill.patientId.name}</div>
                          <small className="text-secondary">{bill.patientId.phone}</small>
                        </div>
                      ) : (
                        <span className="text-secondary">Deleted Patient</span>
                      )}
                    </td>
                    <td>{bill.services}</td>
                    <td className="fw-bold text-white">${bill.totalAmount.toLocaleString()}</td>
                    <td>
                      <span className={`badge-status badge-${bill.paymentStatus.toLowerCase()}`}>
                        {bill.paymentStatus}
                      </span>
                    </td>
                    {role === 'Admin' && (
                      <td>
                        <button
                          className={`btn btn-xs py-1 px-2.5 rounded-2 border-0 fw-semibold text-xs ${
                            bill.paymentStatus === 'Paid' ? 'btn-outline-warning' : 'btn-outline-success'
                          }`}
                          onClick={() => togglePaymentStatus(bill)}
                        >
                          {bill.paymentStatus === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
                        </button>
                      </td>
                    )}
                    <td className="text-end">
                      <button className="btn btn-outline-warning btn-sm me-2 rounded-3 border-0" onClick={() => openPrintPreview(bill)} title="Print preview">
                        <i className="bi bi-printer-fill"></i>
                      </button>
                      {role === 'Admin' && (
                        <>
                          <button className="btn btn-outline-info btn-sm me-2 rounded-3 border-0" onClick={() => openEditModal(bill)}>
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button className="btn btn-outline-danger btn-sm rounded-3 border-0" onClick={() => handleDelete(bill._id)}>
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Invoice Modal */}
      {showModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '500px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">{editMode ? 'Edit Invoice Details' : 'Create Invoice'}</h5>
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
                    <label className="form-label text-secondary fw-semibold">Services Rendered</label>
                    <input
                      type="text"
                      className="form-control"
                      name="services"
                      value={form.services}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Dental cleaning, consultation"
                    />
                  </div>

                  <div className="row">
                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Total Amount ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="totalAmount"
                        value={form.totalAmount}
                        onChange={handleInputChange}
                        required
                        min="0"
                      />
                    </div>

                    <div className="col mb-3">
                      <label className="form-label text-secondary fw-semibold">Payment Status</label>
                      <select className="form-select" name="paymentStatus" value={form.paymentStatus} onChange={handleInputChange}>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary-grad">{editMode ? 'Update' : 'Generate'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Friendly Preview Modal */}
      {showPrintModal && selectedBill && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100 modal-md" style={{ maxWidth: '640px' }}>
            <div className="modal-content text-dark" style={{ backgroundColor: '#fff', borderRadius: '12px' }}>
              
              {/* Print Area */}
              <div className="p-5" id="printable-invoice">
                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary-subtle">
                  <div>
                    <h3 className="fw-bold text-primary m-0"><i className="bi bi-heart-pulse-fill me-2"></i>CarePulse Clinic</h3>
                    <small className="text-muted">128 Clinical Parkway, New York, NY</small>
                  </div>
                  <div className="text-end">
                    <h5 className="fw-bold text-dark m-0">INVOICE</h5>
                    <small className="text-muted">Ref: {selectedBill._id.substring(18).toUpperCase()}</small>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-6">
                    <span className="text-muted d-block text-xs uppercase fw-semibold">Billed To:</span>
                    <strong className="text-dark fs-5">{selectedBill.patientId?.name || 'Patient'}</strong>
                    <span className="d-block text-muted text-sm">Phone: {selectedBill.patientId?.phone}</span>
                    <span className="d-block text-muted text-sm">Address: {selectedBill.patientId?.address}</span>
                  </div>
                  <div className="col-6 text-end">
                    <span className="text-muted d-block text-xs uppercase fw-semibold">Invoice Date:</span>
                    <strong className="text-dark d-block">{new Date(selectedBill.createdAt).toLocaleDateString()}</strong>
                    <span className="badge mt-2 fs-6 rounded-pill px-3 py-1.5" style={{ backgroundColor: selectedBill.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: selectedBill.paymentStatus === 'Paid' ? '#10b981' : '#d97706' }}>
                      {selectedBill.paymentStatus}
                    </span>
                  </div>
                </div>

                <table className="table table-bordered border-secondary-subtle mb-4">
                  <thead className="table-light">
                    <tr>
                      <th>Services Performed</th>
                      <th className="text-end" style={{ width: '120px' }}>Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedBill.services}</td>
                      <td className="text-end fw-semibold">${selectedBill.totalAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="text-end fw-bold">Total Amount Due:</td>
                      <td className="text-end fw-bold text-primary">${selectedBill.totalAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-center mt-5 pt-3 border-top border-secondary-subtle">
                  <p className="text-muted text-xs mb-1">Thank you for choosing CarePulse for your clinical care.</p>
                  <small className="text-muted text-xxs">For billing queries, contact support@carepulse.com</small>
                </div>
              </div>

              {/* Modal footer controls */}
              <div className="modal-footer d-flex justify-content-end gap-2 border-top border-secondary-subtle p-3 bg-light" style={{ borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <button type="button" className="btn btn-outline-secondary rounded-3" onClick={() => setShowPrintModal(false)}>Close</button>
                <button type="button" className="btn btn-primary rounded-3" onClick={handlePrint}>
                  <i className="bi bi-printer me-2"></i>Print / Export PDF
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
