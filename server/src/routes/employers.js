import express from 'express';
import Company from '../models/Company.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Employer's private company list; ownership comes from the verified token.
router.get('/me', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const companies = await Company.find({ owner: req.user.id });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    // Public directory returns only profile fields, never the owner user document.
    const companies = await Company.find().select('name slug description website location logoUrl');
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { name, description, website, location } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const existing = await Company.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return res.status(409).json({ message: 'A company with this name already exists.' });
    }

    const company = await Company.create({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      website,
      location,
      owner: req.user.id
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;