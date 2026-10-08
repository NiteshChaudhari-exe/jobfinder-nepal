import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// Placeholder routes: this router is not mounted in server/src/index.js yet.
router.get('/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;