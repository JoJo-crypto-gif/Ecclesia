import { Router } from 'express';
import membersRoutes from './members.js';
import zonesRoutes from './zones.js';
import eventsRoutes from './events.js';
import attendanceRoutes from './attendance.js';
import authRoutes from './auth.js';
import usersRoutes from './users.js';
import settingsRoutes from './settings.js';
import messagingRoutes from './messaging.js';
import rolesRoutes from './roles.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User management (admin only inside router)
router.use('/users', requireAuth, usersRoutes);

// Mount resource routes
router.use('/members', membersRoutes);
router.use('/zones', requireAuth, zonesRoutes);
router.use('/events', eventsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/settings', settingsRoutes);
router.use('/messaging', messagingRoutes);
router.use('/roles', rolesRoutes);

export default router;
