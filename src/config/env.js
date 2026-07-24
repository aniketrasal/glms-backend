import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 6000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/glms_db',
  jwtSecret: process.env.JWT_SECRET || 'glms_enterprise_super_secret_jwt_key_2025',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  emailUser: process.env.EMAIL_USER || 'rasalaniket00@gmail.com',
  emailPass: process.env.EMAIL_PASS || '',
};
