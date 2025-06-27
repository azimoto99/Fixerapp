import { Router } from 'express';
import * as enterpriseApi from './enterprise';
import { isAuthenticated as ensureAuthenticated } from '../middleware/auth';
import { requireAuth, isAdmin } from '../auth-helpers';

const router = Router();

// Business profile endpoints
router.get('/business', ensureAuthenticated, enterpriseApi.getBusinessProfile);
router.post('/business', ensureAuthenticated, enterpriseApi.createBusinessProfile);
router.put('/business', ensureAuthenticated, enterpriseApi.updateBusinessProfile);
router.get('/stats', ensureAuthenticated, enterpriseApi.getBusinessStats);

// Logo upload endpoint
router.post('/upload-logo', ensureAuthenticated, enterpriseApi.handleLogoUpload, enterpriseApi.uploadEnterpriseLogo);

// Hub pins endpoints
router.get('/hub-pins', ensureAuthenticated, enterpriseApi.getHubPins);
router.get('/hub-pins/active', enterpriseApi.getActiveHubPins);
router.post('/hub-pins', ensureAuthenticated, enterpriseApi.createHubPin);
router.put('/hub-pins/:id', ensureAuthenticated, enterpriseApi.updateHubPin);
router.delete('/hub-pins/:id', ensureAuthenticated, enterpriseApi.deleteHubPin);
router.get('/hub-pins/:id', enterpriseApi.getHubPinDetails);

// Positions endpoints
router.get('/positions', ensureAuthenticated, enterpriseApi.getPositions);
router.post('/positions', ensureAuthenticated, enterpriseApi.createPosition);
router.put('/positions/:id', ensureAuthenticated, enterpriseApi.updatePosition);
router.delete('/positions/:id', ensureAuthenticated, enterpriseApi.deletePosition);
router.post('/positions/:id/apply', ensureAuthenticated, enterpriseApi.applyToPosition);

// Applications endpoints
router.get('/applications', ensureAuthenticated, enterpriseApi.getBusinessApplications);
router.put('/applications/:id', ensureAuthenticated, enterpriseApi.updateApplicationStatus);

// Admin enterprise endpoints
router.get('/admin/businesses', requireAuth, isAdmin, enterpriseApi.getAllBusinesses);
router.put('/admin/businesses/:id/verify', requireAuth, isAdmin, enterpriseApi.verifyBusiness);

export default router;
