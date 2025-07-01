import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';

const router = express.Router();

// Configure S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: fromEnv(),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Proxy endpoint to serve images from S3
 * GET /api/images/:key
 */
router.get('/*', async (req, res) => {
    if (!BUCKET_NAME) {
        return res.status(500).json({ message: 'S3 bucket not configured' });
    }

    try {
        // Get the full path from the URL (everything after /api/images/)
        const key = (req.params as any)[0];
        
        if (!key) {
            return res.status(400).json({ message: 'Image key is required' });
        }

        console.log('Fetching image from S3:', { bucket: BUCKET_NAME, key });

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        
        if (!response.Body) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Set appropriate headers
        if (response.ContentType) {
            res.setHeader('Content-Type', response.ContentType);
        }
        
        if (response.ContentLength) {
            res.setHeader('Content-Length', response.ContentLength);
        }

        // Set cache headers for better performance
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
        res.setHeader('ETag', response.ETag || '');

        // Stream the image data
        const stream = response.Body as NodeJS.ReadableStream;
        stream.pipe(res);

    } catch (error) {
        console.error('Error fetching image from S3:', error);
        
        if (error instanceof Error) {
            if (error.name === 'NoSuchKey') {
                return res.status(404).json({ message: 'Image not found' });
            } else if (error.name === 'AccessDenied') {
                return res.status(403).json({ message: 'Access denied to image' });
            }
        }
        
        res.status(500).json({ message: 'Failed to fetch image' });
    }
});

export default router;
