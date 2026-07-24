import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import v1Router from './routes/v1/index.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.frontendUrl, credentials: true }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/v1', v1Router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'GLMS API Server', uptime: process.uptime() });
});

// Global Error Handler
app.use(errorHandler);

// Socket.IO real-time connection
io.on('connection', (socket) => {
  logger.info(`[GLMS Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`[GLMS Socket] Client disconnected: ${socket.id}`);
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${config.port} is currently in use. Please stop any process on port ${config.port} or change PORT in .env`);
    } else {
      logger.error('Server error:', err);
    }
  });

  server.listen(config.port, () => {
    logger.info(`🚀 GLMS Enterprise Server running on port ${config.port} [${config.env}]`);
  });
};

startServer();

