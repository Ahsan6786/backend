require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const facultyRoutes = require('./routes/faculty.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const evaluationRoutes = require('./routes/evaluation.routes');
const superAdminRoutes = require('./routes/superAdmin.routes');

// Middleware
const errorMiddleware = require('./middleware/error.middleware');

// Prisma (IMPORTANT for graceful shutdown)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();

// 🔥 FIX 1: FORCE NUMBER
let PORT = Number(process.env.PORT) || 8080;

// ================= Middleware =================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ================= Routes =================
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Error handler
app.use(errorMiddleware);

// ================= SERVER START =================
const startServer = (port) => {
  port = Number(port); // 🔥 FIX 2: ENSURE NUMBER

  const server = app.listen(port, () => {
    console.log(`[SYSTEM] Backend Live on port ${port} 🚀`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const newPort = port + 1; // ✅ number addition
      console.warn(`[SYSTEM] Port ${port} occupied. Trying ${newPort}...`);
      startServer(newPort);
    } else {
      console.error('[SYSTEM] Fatal Server Error:', err);
    }
  });

  // Timeout for large uploads
  server.timeout = 600000;
};

startServer(PORT);

// ================= GRACEFUL SHUTDOWN =================
const gracefulShutdown = async (signal) => {
  console.log(`\n[SYSTEM] ${signal} received. Shutting down...`);

  try {
    await prisma.$disconnect();
    console.log('[SYSTEM] Database disconnected.');

    process.exit(0);
  } catch (err) {
    console.error('[SYSTEM] Shutdown Error:', err);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = app;