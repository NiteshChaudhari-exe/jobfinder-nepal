import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import jobRoutes from './routes/jobs.js';
import authRoutes from './routes/auth.js';
import employerRoutes from './routes/employers.js';
import applicationRoutes from './routes/applications.js';

dotenv.config();

// Fail at startup rather than issuing/verifying tokens with a predictable fallback secret.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters before the server starts.');
}

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const MONGO_URI = process.env.MONGO_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/jobfinder-nepal');
const allowedOrigins = (process.env.CORS_ORIGIN || (isProduction ? '' : 'http://localhost:5173'))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!MONGO_URI) {
  throw new Error('MONGO_URI must be configured before the server starts in production.');
}

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must contain at least one trusted frontend origin in production.');
}

// HTTP middleware and API modules
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include server-to-server and local health checks.
    callback(null, !origin || allowedOrigins.includes(origin));
  }
}));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'JobFinder Nepal API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/applications', applicationRoutes);

// Do not accept requests until the database connection is ready.
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed', error);
    process.exit(1);
  });
