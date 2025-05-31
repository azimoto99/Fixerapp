import { Router } from 'express';
import { getMapboxToken } from './mapbox';

const router = Router();

// Public endpoint to get Mapbox token
router.get('/mapbox/token', getMapboxToken);

export default router;
