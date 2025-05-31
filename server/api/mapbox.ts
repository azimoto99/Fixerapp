import { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export const getMapboxToken = (_req: Request, res: Response) => {
  try {
    const token = process.env.VITE_MAPBOX_ACCESS_TOKEN || '';
    
    if (!token || token === 'your_mapbox_access_token') {
      console.error('Mapbox access token is not properly configured');
      return res.status(500).json({ 
        error: 'Map configuration error. Please try again later.' 
      });
    }
    
    res.json({ token });
  } catch (error) {
    console.error('Error getting Mapbox token:', error);
    res.status(500).json({ 
      error: 'Failed to load map configuration. Please try again later.' 
    });
  }
};
