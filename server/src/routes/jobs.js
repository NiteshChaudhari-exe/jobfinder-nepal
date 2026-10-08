import express from 'express';
import Job from '../models/Job.js';
import Company from '../models/Company.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Build a MongoDB filter from public search parameters; status is always published.
const buildJobFilters = (query = {}) => {
  const filter = { status: 'Published' };

  if (query.location) {
    filter.location = { $regex: query.location, $options: 'i' };
  }

  if (query.category) {
    filter.category = { $regex: query.category, $options: 'i' };
  }

  if (query.jobType) {
    filter.jobType = query.jobType;
  }

  if (query.minSalary) {
    const value = Number(query.minSalary);
    if (!Number.isNaN(value)) {
      filter.salaryMin = { $gte: value };
    }
  }

  if (query.search) {
    const searchValue = query.search.trim();
    if (searchValue) {
      const regex = new RegExp(searchValue, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { location: regex }
      ];
    }
  }

  return filter;
};

// Employer dashboard: return only records owned by the verified caller.
router.get('/me', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user.id }).populate('company').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public discovery endpoint; buildJobFilters always restricts results to Published.
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find(buildJobFilters(req.query)).populate('company').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin-only view includes all statuses for review and moderation.
router.get('/moderation', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const jobs = await Job.find().populate('company').populate('employer', 'name email').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Never disclose unpublished listings through the public detail endpoint.
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: 'Published' })
      .populate('company')
      .populate('employer', 'name email');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit a listing only after checking both role and ownership.
router.patch('/:id', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.user.role !== 'admin' && String(job.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own jobs.' });
    }

    // Explicit allowlist prevents callers from changing ownership or moderation-only fields.
    const allowedFields = ['title', 'description', 'location', 'salaryMin', 'salaryMax', 'jobType', 'category', 'requirements', 'status'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.status) {
      const validStates = ['Published', 'Draft', 'Rejected', 'Hidden'];
      if (!validStates.includes(updates.status)) {
        return res.status(400).json({ message: 'Invalid job status' });
      }
      if (req.user.role !== 'admin' && !['Published', 'Draft'].includes(updates.status)) {
        return res.status(403).json({ message: 'Employers can only publish or save their jobs as drafts.' });
      }
    }

    if (req.body.companyName) {
      let company = await Company.findOne({ name: req.body.companyName, owner: job.employer });
      if (!company) {
        company = await Company.create({
          name: req.body.companyName,
          slug: req.body.companyName.toLowerCase().replace(/\s+/g, '-'),
          owner: job.employer
        });
      }
      updates.company = company._id;
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('company');
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Employers may publish/save drafts; admins may also moderate or hide listings.
router.patch('/:id/status', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStates = ['Published', 'Draft', 'Rejected', 'Hidden'];

    if (!validStates.includes(status)) {
      return res.status(400).json({ message: 'Invalid job status' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.user.role !== 'admin' && String(job.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only update your own jobs.' });
    }

    if (req.user.role !== 'admin' && !['Published', 'Draft'].includes(status)) {
      return res.status(403).json({ message: 'Employers can only publish or save their jobs as drafts.' });
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Destructive operation remains restricted to the job owner or an administrator.
router.delete('/:id', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.user.role !== 'admin' && String(job.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own jobs.' });
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a listing using the caller's identity rather than trusting client ownership data.
router.post('/', requireAuth, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { title, description, location, salaryMin, salaryMax, jobType, category, requirements, companyName, status = 'Published' } = req.body;

    if (!title || !description || !location || !companyName) {
      return res.status(400).json({ message: 'Title, description, location, and companyName are required' });
    }

    // Employers cannot assign listings to another account; only admins may do so.
    const ownerId = req.user.role === 'admin' && req.body.employerId ? req.body.employerId : req.user.id;
    const validStates = req.user.role === 'admin' ? ['Published', 'Draft', 'Rejected', 'Hidden'] : ['Published', 'Draft'];
    if (!validStates.includes(status)) {
      return res.status(400).json({ message: 'Invalid job status' });
    }

    let company = await Company.findOne({ name: companyName, owner: ownerId });
    if (!company) {
      company = await Company.create({
        name: companyName,
        slug: companyName.toLowerCase().replace(/\s+/g, '-'),
        owner: ownerId
      });
    }

    const job = await Job.create({
      title,
      description,
      company: company._id,
      employer: ownerId,
      location,
      salaryMin,
      salaryMax,
      jobType,
      category,
      requirements,
      status
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;