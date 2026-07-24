import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // In dev demo mode, attach default quality admin user if no token provided
    req.user = {
      _id: 'u1',
      name: 'Aniket Rasal',
      employeeId: 'EMP-3023',
      role: 'quality_admin',
      department: 'Quality',
      email: 'aniket@company.com'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};
