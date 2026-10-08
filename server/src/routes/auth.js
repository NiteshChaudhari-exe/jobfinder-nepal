import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Normalize user-supplied email so registration and login use the same canonical form.
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

// Keep auth responses to fields safe for the client; never serialize the full model.
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!name || !cleanEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Public callers must never be able to create an administrator account.
    if (!['user', 'employer'].includes(role)) {
      return res.status(400).json({ message: 'Only user and employer accounts can be registered publicly' });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name: String(name).trim(), email: cleanEmail, password: hashedPassword, role });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);

    // Password is excluded by default in the schema and selected only for comparison here.
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;