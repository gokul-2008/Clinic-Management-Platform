import User from '../models/User.js';
import Patient from '../models/Patient.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '30d' });
};

// Register user
export const registerUser = async (req, res) => {
  try {
    const { email, password, role, name, age, gender, phone, address } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let associatedId = null;

    if (role === 'Patient') {
      if (!name || !age || !gender || !phone || !address) {
        return res.status(400).json({ message: 'Patient profile details (name, age, gender, phone, address) are required.' });
      }
      const patient = await Patient.create({ name, age, gender, phone, address });
      associatedId = patient._id;
    }

    const user = await User.create({ email, password, role, associatedId });
    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      associatedId: user.associatedId,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        associatedId: user.associatedId,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

