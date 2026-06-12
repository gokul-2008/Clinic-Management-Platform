# Clinic Management Platform

A modern, high-end full-stack MERN (MongoDB, Express, React, Node.js) application designed for managing patients, appointments, and billing in a clinic setting. Built using a premium dark-mode custom layout combined with Bootstrap 5.

---

## Folder Structure

```
clinic-management-platform/
├── backend/
│   ├── config/
│   │   └── db.js            # Mongoose DB connection helper
│   ├── controllers/
│   │   ├── patientController.js
│   │   ├── appointmentController.js
│   │   ├── billingController.js
│   │   └── dashboardController.js
│   ├── models/
│   │   ├── Patient.js
│   │   ├── Appointment.js
│   │   └── Billing.js
│   ├── routes/
│   │   ├── patientRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── billingRoutes.js
│   │   └── dashboardRoutes.js
│   ├── .env.example
│   ├── .env
│   ├── server.js            # Express Entrypoint
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Patients.jsx
│   │   │   ├── Appointments.jsx
│   │   │   └── Billing.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css        # Premium custom styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json             # Root runner
└── README.md
```

---

## Features

1. **Dashboard Analytics**
   - Real-time display of Total Patients, Active Bookings, and Total Clinic Revenue (accumulated from paid bills).
   - Recents Feed showing the last 5 registered patients and appointments.

2. **Patient Registry**
   - Register new patients with full details (Name, Age, Gender, Phone, Address).
   - View, edit details, or delete patients.
   - **Cascade Deletes**: Deleting a patient automatically cleans up their related appointments and billing entries.

3. **Appointment Booking**
   - Schedule appointments linking directly to registered patients.
   - Update appointment status dynamically (Booked, Completed, Cancelled).
   - Filter views based on booking status.

4. **Billing System**
   - Raise billing invoices specifying services rendered and pricing.
   - One-click payments status toggling (Mark Paid / Unpaid) which instantly recalculates revenue metrics on the dashboard.

---

## Requirements

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) (running locally on default port `27017`)

---

## How to Run Locally

### 1. Database Setup
Ensure your local MongoDB service is started and running. The database name `clinic_management` will be automatically generated upon initial write.

### 2. Fast-Start (Concurrently)
You can launch both the client and server concurrently from the root directory.

1. **Install dependencies for both projects:**
   ```bash
   npm run install-all
   ```
2. **Start both servers:**
   ```bash
   npm run dev
   ```

*The Express API will boot up on [http://localhost:5000](http://localhost:5000) and the React Frontend on [http://localhost:5173](http://localhost:5173).*

---

### Alternative: Step-by-Step Launch

#### Running the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start in development mode:
   ```bash
   npm run dev
   ```

#### Running the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
