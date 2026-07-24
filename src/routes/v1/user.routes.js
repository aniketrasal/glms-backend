import express from 'express';
import { getUsers, createUser, restrictUser } from '../../controllers/user.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getUsers)
  .post(protect, createUser);

router.patch('/:id/restrict', protect, restrictUser);

export default router;
