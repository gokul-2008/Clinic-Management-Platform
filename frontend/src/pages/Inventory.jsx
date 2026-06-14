import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_BASE = 'http://localhost:5000/api';

export default function Inventory({ toggleMobileSidebar }) {
  const [medicines, setMedicines] = useState([]);
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
    stock: '',
    price: '',
    unit: 'tablets'
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchMedicines = async () => {
    try {
      const res = await axios.get(`${API_BASE}/medicines`, getHeaders());
      setMedicines(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load pharmacy inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setForm({ name: '', stock: '', price: '', unit: 'tablets' });
    setEditMode(false);
    setShowModal(true);
  };

  const openEditModal = (med) => {
    setForm({
      name: med.name,
      stock: med.stock,
      price: med.price,
      unit: med.unit
    });
    setCurrentId(med._id);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`${API_BASE}/medicines/${currentId}`, form, getHeaders());
        setSuccessMsg('Medicine details updated in inventory.');
      } else {
        await axios.post(`${API_BASE}/medicines`, form, getHeaders());
        setSuccessMsg('Medicine added to pharmacy inventory.');
      }
      setShowModal(false);
      fetchMedicines();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save medicine records.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine from the inventory registry?')) {
      try {
        await axios.delete(`${API_BASE}/medicines/${id}`, getHeaders());
        setSuccessMsg('Medicine deleted.');
        fetchMedicines();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error(err);
        setError('Failed to delete medicine records.');
      }
    }
  };

  return (
    <>
      <Navbar title="Pharmacy Inventory" toggleMobileSidebar={toggleMobileSidebar} />

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
            <i className="bi bi-bag-plus-fill me-2"></i>
            Add Medicine Stock
          </button>
        )}
      </div>

      {/* Table grid */}
      <div className="glass-card">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-prescription2 fs-1 d-block mb-3"></i>
            No medicines registered in pharmacy stocks
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-borderless table-custom m-0">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Stock Available</th>
                  <th>Price / Unit</th>
                  <th>Dispense Unit</th>
                  <th>Stock Warning</th>
                  {role === 'Admin' && <th className="text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => (
                  <tr key={med._id}>
                    <td className="fw-semibold text-white text-capitalize">{med.name}</td>
                    <td className="fw-bold">{med.stock}</td>
                    <td>${med.price.toFixed(2)}</td>
                    <td>{med.unit}</td>
                    <td>
                      {med.stock === 0 ? (
                        <span className="badge bg-danger text-white rounded-pill px-2.5 py-1">Out of Stock</span>
                      ) : med.stock < 20 ? (
                        <span className="badge bg-warning text-dark rounded-pill px-2.5 py-1">Low Stock ({med.stock})</span>
                      ) : (
                        <span className="badge bg-success text-white rounded-pill px-2.5 py-1">Adequate</span>
                      )}
                    </td>
                    {role === 'Admin' && (
                      <td className="text-end">
                        <button className="btn btn-outline-info btn-sm me-2 rounded-3 border-0" onClick={() => openEditModal(med)}>
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="btn btn-outline-danger btn-sm rounded-3 border-0" onClick={() => handleDelete(med._id)}>
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

      {/* Add / Edit Medicine Modal */}
      {showModal && (
        <div className="modal d-block d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.7)', zIndex: 1050 }}>
          <div className="modal-dialog w-100" style={{ maxWidth: '500px' }}>
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-white">{editMode ? 'Edit Medicine Entry' : 'Add Medicine Stock'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="text-white form-label text-secondary fw-semibold">Medicine Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Ibuprofen 400mg"
                      disabled={editMode} // Disable renaming
                    />
                  </div>
                  <div className="row">
                    <div className="col mb-3">
                      <label className="text-white form-label text-secondary fw-semibold">Stock Quantity</label>
                      <input
                        type="number"
                        className="form-control"
                        name="stock"
                        value={form.stock}
                        onChange={handleInputChange}
                        required
                        min="0"
                        placeholder="e.g. 100"
                      />
                    </div>
                    <div className="col mb-3">
                      <label className="text-white form-label text-secondary fw-semibold">Price per Unit ($)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="price"
                        value={form.price}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        min="0"
                        placeholder="e.g. 0.15"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-white form-label text-secondary fw-semibold">Dispense Unit</label>
                    <select className="form-select" name="unit" value={form.unit} onChange={handleInputChange}>
                      <option value="tablets " className="text-dark">tablets</option>
                      <option value="capsules" className="text-dark">capsules</option>
                      <option value="bottles" className="text-dark">bottles</option>
                      <option value="tubes" className="text-dark">tubes</option>
                      <option value="vials" className="text-dark">vials</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer modal-footer-custom d-flex justify-content-end gap-2">
                  <button type="button" className="text-white btn btn-outline-secondary rounded-3" onClick={() => setShowModal(false)}>Cancel</button>
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
