require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, getDBStatus } = require('./config/db');
const errorHandler = require('./middleware/errorHandler.middleware');
const { seedData } = require('./scripts/seed.js');

// Routes
const authRoutes = require('./routes/auth.routes');
const jobRoutes = require('./routes/job.routes');
const applicantRoutes = require('./routes/applicant.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/sample_resumes', express.static(path.join(__dirname, 'sample_resumes')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Intelligent Applicant Screening API',
    database: getDBStatus(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/analytics', analyticsRoutes);

// SPA fallback: send index.html for non-API client routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server and connect Database
async function startServer() {
  console.log('------------------------------------------------------------');
  console.log('Starting "Intelligent Applicant Screening" System...');
  console.log('------------------------------------------------------------');

  // Attempt MongoDB Connection
  await connectDB();

  // Initialize seed data (creates demo recruiter & starter jobs)
  try {
    await seedData();
  } catch (seedErr) {
    console.warn('[Seed Warning]:', seedErr.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`📄 Recruiter Portal: http://localhost:${PORT}/#!/dashboard`);
    console.log(`🔑 Demo Login: recruiter@demo.com / password123`);
    console.log(`============================================================\n`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
