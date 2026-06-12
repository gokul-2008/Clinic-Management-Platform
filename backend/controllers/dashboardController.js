import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total counts
    const [totalPatients, totalDoctors, totalAppointments] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments(),
      Appointment.countDocuments()
    ]);

    // 2. Revenue calculation
    const revenueStats = await Billing.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;

    // 3. Paid vs Unpaid Billing Distribution
    const billingStatus = await Billing.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
    ]);

    // 4. Monthly Revenue (Last 6 Months)
    const monthlyRevenue = await Billing.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    // 5. Patient Registration Growth
    const patientGrowth = await Patient.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    // 6. Recent Feeds
    const recentAppointments = await Appointment.find()
      .populate('patientId')
      .populate('doctorId', 'name specialty')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPatients = await Patient.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalPatients,
      totalDoctors,
      totalAppointments,
      totalRevenue,
      billingStatus,
      monthlyRevenue,
      patientGrowth,
      recentAppointments,
      recentPatients
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
