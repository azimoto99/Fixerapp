import { Router } from 'express';
import * as enterpriseApi from './enterprise';
import { isAuthenticated, requireAuth, isAdmin } from '../auth-helpers';

const router = Router();

// Business profile endpoints
router.get('/business', isAuthenticated, enterpriseApi.getBusinessProfile);
router.post('/business', isAuthenticated, enterpriseApi.createBusinessProfile);
router.put('/business', isAuthenticated, enterpriseApi.updateBusinessProfile);
router.get('/stats', isAuthenticated, enterpriseApi.getBusinessStats);

// Hub pins endpoints
router.get('/hub-pins', isAuthenticated, enterpriseApi.getHubPins);
router.get('/hub-pins/active', enterpriseApi.getActiveHubPins);
router.post('/hub-pins', isAuthenticated, enterpriseApi.createHubPin);
router.put('/hub-pins/:id', isAuthenticated, enterpriseApi.updateHubPin);
router.delete('/hub-pins/:id', isAuthenticated, enterpriseApi.deleteHubPin);
router.get('/hub-pins/:id', enterpriseApi.getHubPinDetails);

// Positions endpoints
router.get('/positions', isAuthenticated, enterpriseApi.getPositions);
router.post('/positions', isAuthenticated, enterpriseApi.createPosition);
router.put('/positions/:id', isAuthenticated, enterpriseApi.updatePosition);
router.delete('/positions/:id', isAuthenticated, enterpriseApi.deletePosition);
router.post('/positions/:id/apply', isAuthenticated, enterpriseApi.applyToPosition);

// Applications endpoints
router.get('/applications', isAuthenticated, enterpriseApi.getBusinessApplications);
router.put('/applications/:id', isAuthenticated, enterpriseApi.updateApplicationStatus);

// Admin enterprise endpoints
router.get('/admin/businesses', requireAuth, isAdmin, enterpriseApi.getAllBusinesses);
router.put('/admin/businesses/:id/verify', requireAuth, isAdmin, enterpriseApi.verifyBusiness);

export default router;
