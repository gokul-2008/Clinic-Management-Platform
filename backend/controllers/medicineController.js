import Medicine from '../models/Medicine.js';

// Create Medicine
export const createMedicine = async (req, res) => {
  try {
    const { name, stock, price, unit } = req.body;
    if (!name || stock === undefined || price === undefined || !unit) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const nameLower = name.toLowerCase().trim();
    const exists = await Medicine.findOne({ name: nameLower });
    if (exists) {
      return res.status(400).json({ message: 'Medicine already exists in inventory.' });
    }

    const medicine = new Medicine({
      name: nameLower,
      stock,
      price,
      unit
    });

    const saved = await medicine.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Medicines
export const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.status(200).json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Medicine Details / Stock
export const updateMedicine = async (req, res) => {
  try {
    const { name, stock, price, unit } = req.body;
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }

    if (name) medicine.name = name.toLowerCase().trim();
    if (stock !== undefined) medicine.stock = stock;
    if (price !== undefined) medicine.price = price;
    if (unit) medicine.unit = unit;

    const updated = await medicine.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Medicine
export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    await Medicine.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Medicine deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
