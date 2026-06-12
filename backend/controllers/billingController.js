import Billing from '../models/Billing.js';
import Patient from '../models/Patient.js';

// Create Invoice
export const createBill = async (req, res) => {
  try {
    const { patientId, services, totalAmount, paymentStatus } = req.body;
    if (!patientId || !services || totalAmount === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const patientExists = await Patient.findById(patientId);
    if (!patientExists) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const bill = new Billing({
      patientId,
      services,
      totalAmount,
      paymentStatus: paymentStatus || 'Unpaid'
    });

    const saved = await bill.save();
    const populated = await Billing.findById(saved._id).populate('patientId');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Invoices
export const getBills = async (req, res) => {
  try {
    const bills = await Billing.find()
      .populate('patientId')
      .sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Invoice
export const updateBill = async (req, res) => {
  try {
    const { services, totalAmount, paymentStatus } = req.body;
    const bill = await Billing.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    bill.services = services || bill.services;
    bill.totalAmount = totalAmount !== undefined ? totalAmount : bill.totalAmount;
    bill.paymentStatus = paymentStatus || bill.paymentStatus;

    const updated = await bill.save();
    const populated = await Billing.findById(updated._id).populate('patientId');
    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Invoice
export const deleteBill = async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    await Billing.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
