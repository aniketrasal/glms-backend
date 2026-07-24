import { User } from '../models/User.model.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const generateToken = (user) => {
  return jwt.sign(
    { _id: user._id, name: `${user.firstName} ${user.lastName}`, employeeId: user.employeeId, role: user.role, department: user.department, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check user
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        employeeId: user.employeeId,
        role: user.role,
        roleLabel: user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        department: user.department,
        email: user.email,
        initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
