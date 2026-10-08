import express from 'express';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Candidate's own application history.
router.get('/me', requireAuth, async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user.id })
      .populate('job')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Results depend on role: candidate's own records, employer's jobs, or admin-wide access.
router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};

    // Applicants see their own records, employers see records for their jobs, admins see all.
    if (req.user.role === 'employer') {
      const employerJobs = await Job.find({ employer: req.user.id }).select('_id');
      filter = { job: { $in: employerJobs.map((job) => job._id) } };
    } else if (req.user.role !== 'admin') {
      filter = { applicant: req.user.id };
    }

    const applications = await Application.find(filter)
      .populate('job')
      .populate('applicant', 'name email');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Applicant identity/status are assigned on the server, not accepted from the request body.
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only candidate accounts can apply to jobs.' });
    }

    const { job, resumeUrl, coverLetter } = req.body;

    if (!job || !resumeUrl?.trim() || !coverLetter?.trim()) {
      return res.status(400).json({ message: 'Job, resume link, and cover letter are required.' });
    }

    const publishedJob = await Job.findOne({ _id: job, status: 'Published' });
    if (!publishedJob) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const existingApplication = await Application.findOne({ job, applicant: req.user.id });
    if (existingApplication) {
      return res.status(409).json({ message: 'You have already applied to this job.' });
    }

    const application = await Application.create({
      job,
      applicant: req.user.id,
      resumeUrl: resumeUrl || '',
      coverLetter: coverLetter || '',
      status: 'Pending'
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    let updates = {};

    // Applicant-editable content and employer/admin status changes have separate permissions.
    if (req.user.role === 'employer') {
      const job = await Job.findOne({ _id: application.job, employer: req.user.id });
      if (!job) {
        return res.status(403).json({ message: 'You can only manage applications for your own jobs.' });
      }
      if (!['Pending', 'Accepted', 'Rejected'].includes(req.body.status)) {
        return res.status(400).json({ message: 'A valid application status is required.' });
      }
      updates = { status: req.body.status };
    } else if (req.user.role === 'admin') {
      if (!['Pending', 'Accepted', 'Rejected'].includes(req.body.status)) {
        return res.status(400).json({ message: 'A valid application status is required.' });
      }
      updates = { status: req.body.status };
    } else {
      if (String(application.applicant) !== String(req.user.id)) {
        return res.status(404).json({ message: 'Application not found' });
      }
      if (req.body.resumeUrl !== undefined) updates.resumeUrl = req.body.resumeUrl;
      if (req.body.coverLetter !== undefined) updates.coverLetter = req.body.coverLetter;
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No editable application fields were provided.' });
      }
    }

    const updatedApplication = await Application.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    res.json(updatedApplication);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;