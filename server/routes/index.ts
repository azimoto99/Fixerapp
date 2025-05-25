import express from "express";
import { authRouter } from './auth';
import { jobsRouter } from './jobs';
import { paymentsRouter } from './payments';
import { messagingRouter } from './messaging';

const router = express.Router();

// Organize all route modules
router.use('/auth', authRouter);
router.use('/jobs', jobsRouter);
router.use('/payments', paymentsRouter);
router.use('/messaging', messagingRouter);

export { router as apiRoutes };