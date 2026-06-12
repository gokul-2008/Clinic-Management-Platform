import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


const API_BASE = 'http://localhost:5000/api';

export default function Dashboard({ toggleMobileSidebar }) {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    billingStatus: [],
    monthlyRevenue: [],
    patientGrowth: [],
    recentAppointments: [],
    recentPatients: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dashboard metrics. Please check connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 text-white">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // 1. Data mapping for line chart (Monthly Revenue)
  const revenueLabels = stats.monthlyRevenue.map(item => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[item._id.month - 1]} ${item._id.year}`;
  });
  const revenueValues = stats.monthlyRevenue.map(item => item.revenue);

  const revenueChartData = {
    labels: revenueLabels.length > 0 ? revenueLabels : ['No Data'],
    datasets: [{
      label: 'Monthly Revenue ($)',
      data: revenueValues.length > 0 ? revenueValues : [0],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4
    }]
  };

  // 2. Data mapping for doughnut chart (Paid vs Unpaid)
  const paidCount = stats.billingStatus.find(b => b._id === 'Paid')?.count || 0;
  const unpaidCount = stats.billingStatus.find(b => b._id === 'Unpaid')?.count || 0;
  const billingChartData = {
    labels: ['Paid', 'Unpaid'],
    datasets: [{
      data: [paidCount, unpaidCount],
      backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'],
      borderColor: ['#10b981', '#f59e0b'],
      borderWidth: 1
    }]
  };

  // 3. Data mapping for bar chart (Patient Growth)
  const growthLabels = stats.patientGrowth.map(item => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[item._id.month - 1]} ${item._id.year}`;
  });
  const growthValues = stats.patientGrowth.map(item => item.count);

  const growthChartData = {
    labels: growthLabels.length > 0 ? growthLabels : ['No Data'],
    datasets: [{
      label: 'Registered Patients',
      data: growthValues.length > 0 ? growthValues : [0],
      backgroundColor: 'rgba(139, 92, 246, 0.6)',
      borderColor: '#8b5cf6',
      borderWidth: 1,
      borderRadius: 6
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af', font: { family: 'Outfit' } } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
    }
  };

  return (
    <>
      <Navbar title="Dashboard Overview" toggleMobileSidebar={toggleMobileSidebar} />

      {error && (
        <div className="alert alert-danger border-0 rounded-3 mb-4 p-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary fw-semibold">Total Patients</span>
              <h2 className="mt-2 mb-0 fw-bold text-white">{stats.totalPatients}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--accent-gradient)' }}>
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary fw-semibold">Registered Doctors</span>
              <h2 className="mt-2 mb-0 fw-bold text-white">{stats.totalDoctors}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--success-gradient)' }}>
              <i className="bi bi-person-badge-fill"></i>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary fw-semibold">Total Appointments</span>
              <h2 className="mt-2 mb-0 fw-bold text-white">{stats.totalAppointments}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--purple-gradient)' }}>
              <i className="bi bi-calendar-event-fill"></i>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-card d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary fw-semibold">Total Revenue</span>
              <h2 className="mt-2 mb-0 fw-bold text-white">${stats.totalRevenue.toLocaleString()}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'var(--warning-gradient)' }}>
              <i className="bi bi-currency-dollar"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-5">
        {/* Revenue trend line */}
        <div className="col-12 col-lg-8">
          <div className="glass-card">
            <h5 className="text-white fw-bold mb-4">Financial Growth Trends</h5>
            <div style={{ height: '300px' }}>
              <Line data={revenueChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Invoice status distribution */}
        <div className="col-12 col-lg-4">
          <div className="glass-card">
            <h5 className="text-white fw-bold mb-4">Invoicing Status Ratio</h5>
            <div className="d-flex align-items-center justify-content-center" style={{ height: '300px' }}>
              {paidCount === 0 && unpaidCount === 0 ? (
                <span className="text-secondary">No billing details registered</span>
              ) : (
                <Doughnut 
                  data={billingChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#9ca3af', font: { family: 'Outfit' } } } }
                  }} 
                />
              )}
            </div>
          </div>
        </div>

        {/* Patient growth bar chart */}
        <div className="col-12">
          <div className="glass-card">
            <h5 className="text-white fw-bold mb-4">Patient Registrations Growth</h5>
            <div style={{ height: '300px' }}>
              <Bar data={growthChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Recents Feeds */}
      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="glass-card h-100">
            <h5 className="text-white mb-4 fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-calendar-check-fill text-primary"></i>
              Recent Appointments
            </h5>
            <div className="table-responsive">
              <table className="table table-dark table-borderless table-custom m-0">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center text-secondary py-4">No appointments scheduled</td>
                    </tr>
                  ) : (
                    stats.recentAppointments.map((appt) => (
                      <tr key={appt._id}>
                        <td className="fw-semibold">{appt.patientId?.name || 'Deleted Patient'}</td>
                        <td>Dr. {appt.doctorId?.name || 'Unassigned'}</td>
                        <td>{new Date(appt.date).toLocaleDateString()}</td>
                        <td>{appt.time}</td>
                        <td>
                          <span className={`badge-status badge-${appt.status.toLowerCase()}`}>
                            {appt.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="glass-card h-100">
            <h5 className="text-white mb-4 fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-person-plus-fill text-primary"></i>
              Recent Patients
            </h5>
            <ul className="list-group list-group-flush bg-transparent">
              {stats.recentPatients.length === 0 ? (
                <li className="list-group-item bg-transparent text-secondary border-0 p-0 text-center py-4">No patients registered</li>
              ) : (
                stats.recentPatients.map((pat) => (
                  <li key={pat._id} className="list-group-item bg-transparent border-bottom px-0 py-3 d-flex align-items-center justify-content-between text-white" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div>
                      <h6 className="m-0 fw-semibold">{pat.name}</h6>
                      <small className="text-secondary">{pat.gender}, {pat.age} yrs</small>
                    </div>
                    <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2.5 py-1.5">{pat.phone}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
