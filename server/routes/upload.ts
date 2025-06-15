import express from 'express';
import multer from 'multer';
import { uploadProfileImage, uploadFile, validateImageFile } from '../services/s3Service.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Upload profile image
 * POST /api/upload/profile-image
 */
router.post('/profile-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided',
        message: 'Please select an image file to upload'
      });
    }

    const userId = req.user!.id;
    
    // Validate image
    validateImageFile(req.file.buffer);
    
    // Upload to S3
    const uploadResult = await uploadProfileImage(
      userId, 
      req.file.buffer, 
      req.file.originalname
    );
    
    // Update user profile in database
    const updatedUser = await req.storage.updateUser(userId, {
      avatarUrl: uploadResult.url
    });
    
    if (!updatedUser) {
      return res.status(500).json({
        error: 'Failed to update user profile',
        message: 'Image uploaded but failed to update database'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        url: uploadResult.url,
        size: uploadResult.size,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl
        }
      }
    });
    
  } catch (error) {
    console.error('Profile image upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('File size exceeds')) {
        return res.status(413).json({
          error: 'File too large',
          message: 'Image must be smaller than 5MB'
        });
      }
      
      if (error.message.includes('Invalid image')) {
        return res.status(400).json({
          error: 'Invalid file format',
          message: 'Please upload a valid image file (JPG, PNG, GIF, WebP)'
        });
      }
    }
    
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload profile image. Please try again.'
    });
  }
});

/**
 * Upload profile image from base64
 * POST /api/upload/profile-image-base64
 */
router.post('/profile-image-base64', requireAuth, async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({
        error: 'Invalid image data',
        message: 'Please provide valid base64 image data'
      });
    }
    
    const userId = req.user!.id;
    
    // Use the storage method which now handles S3 upload
    const updatedUser = await req.storage.uploadProfileImage(userId, imageData);
    
    if (!updatedUser) {
      return res.status(500).json({
        error: 'Upload failed',
        message: 'Failed to upload profile image'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          avatarUrl: updatedUser.avatarUrl
        }
      }
    });
    
  } catch (error) {
    console.error('Base64 profile image upload error:', error);
    
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload profile image. Please try again.'
    });
  }
});

/**
 * Upload general file
 * POST /api/upload/file
 */
router.post('/file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please select a file to upload'
      });
    }
    
    // Upload to S3
    const uploadResult = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'user-files'
    );
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: uploadResult.url,
        key: uploadResult.key,
        size: uploadResult.size,
        originalName: req.file.originalname,
        contentType: req.file.mimetype
      }
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    
    res.status(500).json({
      error: 'Upload failed',
      message: 'Failed to upload file. Please try again.'
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'File must be smaller than 5MB'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only image files are allowed'
    });
  }
  
  next(error);
});

export default router;
