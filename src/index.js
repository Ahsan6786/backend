require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth.routes');
console.log('[SYSTEM] Auth routes imported');
const adminRoutes = require('./routes/admin.routes');
console.log('[SYSTEM] Admin routes imported');
const facultyRoutes = require('./routes/faculty.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const evaluationRoutes = require('./routes/evaluation.routes');
const superAdminRoutes = require('./routes/superAdmin.routes');
console.log('[SYSTEM] All route modules required');

// Middleware
const errorMiddleware = require('./middleware/error.middleware');

// Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();

// ================= PORT =================
const PORT = process.env.PORT || 8080;

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ================= ROUTES =================
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

// Test route (to confirm /api/ prefix works)
app.get('/api/test', (req, res) => res.send('API OK'));

// Debug endpoint to list all registered routes
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
          const prefix = middleware.regexp.source
            .replace('\\/?(?=\\/|$)', '')
            .replace('^\\', '')
            .replace('\\/', '/');
          routes.push(`${methods} ${prefix}${path}`);
        }
      });
    }
  });
  res.json({
    message: 'Active Routes',
    timestamp: new Date(),
    routes: routes.sort()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Health Check (Render uses this sometimes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// ================= 404 =================
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// ================= ERROR HANDLER =================
app.use(errorMiddleware);

// ================= SERVER START =================
const server = app.listen(PORT, () => {
  console.log(`[SYSTEM] Backend Live on port ${PORT} 🚀`);
});

// Timeout (important for uploads)
server.timeout = 600000;

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