import { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export const getMapboxToken = (req: Request, res: Response) => {
  const token = process.env.VITE_MAPBOX_ACCESS_TOKEN || '';
  if (!token || token === 'your_mapbox_access_token') {
    return res.status(500).json({ 
      error: 'Mapbox access token is not configured' 
    });
  }
  res.json({ token });
};
