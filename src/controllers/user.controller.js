import { User } from '../models/User.model.js';
import bcrypt from 'bcryptjs';

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, employeeId, email, department, role } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this Email or Employee ID already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('demo123', salt); // Default password for new users

    const parts = name.split(' ');
    const firstName = parts[0] || 'User';
    const lastName = parts.slice(1).join(' ') || 'Name';

    const user = new User({
      employeeId,
      firstName,
      lastName,
      email,
      passwordHash,
      role: role.toLowerCase().replace(' ', '_'),
      department,
      isActive: true
    });

    await user.save();
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restrictUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isRestricted = !user.isRestricted;
    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
