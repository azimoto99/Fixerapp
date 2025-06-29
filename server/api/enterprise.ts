import { Request, Response } from 'express';
import { db } from '../db';
import { 
  enterpriseBusinesses, 
  hubPins, 
  enterprisePositions, 
  enterpriseApplications,
  users 
} from '@shared/schema';
import { eq, and, desc, count, sql, isNull, ilike, or, asc, not, like, isNotNull, sum, avg, max, min } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import { uploadFile } from '../services/s3Service';

// Configure multer for logo uploads
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Upload enterprise logo
export async function uploadEnterpriseLogo(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('Logo upload attempt:', {
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Upload to S3
    const { url: logoUrl } = await uploadFile(
      req.file.buffer, 
      `enterprise-logo-${userId}-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype,
      'enterprise-logos'
    );

    console.log('Enterprise logo uploaded successfully:', logoUrl);

    res.json({
      message: 'Logo uploaded successfully',
      logoUrl
    });
  } catch (error) {
    console.error('Enterprise logo upload error:', error);
    
    let errorMessage = 'Failed to upload logo';
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        errorMessage = 'AWS credentials not configured properly';
      } else if (error.message.includes('bucket')) {
        errorMessage = 'S3 bucket configuration error';
      } else if (error.message.includes('Image must be smaller')) {
        errorMessage = error.message;
      } else if (error.message.includes('Invalid file type')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({
      message: errorMessage
    });
  }
}

// Middleware function to handle multer upload
export const handleLogoUpload = logoUpload.single('logo');

export async function uploadAvatar(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file uploaded' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Avatar upload attempt:', {
      userId: user.id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Upload to S3 using the existing service
    const { url: avatarUrl } = await uploadFile(
      req.file.buffer, 
      `user-avatar-${user.id}-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype,
      'user-avatars'
    );

    // Update user in database
    await db.update(users)
      .set({ avatarUrl: avatarUrl })
      .where(eq(users.id, user.id));

    console.log('Avatar uploaded successfully:', avatarUrl);
    res.json({ url: avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    
    let errorMessage = 'Failed to upload avatar';
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        errorMessage = 'AWS credentials not configured properly';
      } else if (error.message.includes('bucket')) {
        errorMessage = 'S3 bucket configuration error';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({ message: errorMessage });
  }
}

export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file uploaded' });
    }

    console.log('Logo upload attempt:', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Upload to S3 using the existing service
    const { url: logoUrl } = await uploadFile(
      req.file.buffer, 
      `business-logo-${Date.now()}.${req.file.originalname.split('.').pop()}`,
      req.file.mimetype,
      'business-logos'
    );

    console.log('Logo uploaded successfully:', logoUrl);
    res.json({ url: logoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    
    let errorMessage = 'Failed to upload logo';
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        errorMessage = 'AWS credentials not configured properly';
      } else if (error.message.includes('bucket')) {
        errorMessage = 'S3 bucket configuration error';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({ message: errorMessage });
  }
}

export async function testEndpoint(req: Request, res: Response) {
  console.log('🧪 Test endpoint called');
  res.json({ message: 'Enterprise API is working', timestamp: Date.now() });
}

// Get business profile for current user
export async function getBusinessProfile(req: Request, res: Response) {
  try {
    console.log('🏢 Getting business profile for user:', req.user?.id);
    
    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ No user ID found in business profile request');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    console.log('🏢 Business profile result:', business ? `Found: ${business.businessName} (ID: ${business.id})` : 'Not found');
    
    res.json(business || null);
  } catch (error) {
    console.error('❌ Error fetching business profile:', error);
    res.status(500).json({ message: 'Failed to fetch business profile' });
  }
}

// Create business profile
export async function createBusinessProfile(req: Request, res: Response) {
  console.log('🏢 Starting business profile creation for user:', req.user?.id);
  console.log('🏢 Request body:', JSON.stringify(req.body, null, 2));
  const startTime = Date.now();
  
  // Add request timeout handler
  const timeoutDuration = 30000; // 30-second overall safeguard
  const timeout = setTimeout(() => {
    console.error(`⚠️ Business profile creation timed out after ${timeoutDuration / 1000} seconds`);
    if (!res.headersSent) {
      res.status(408).json({ message: "Business profile creation timed out. Please try again." });
    }
  }, timeoutDuration);
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log('⚠️ No user ID found in request');
      clearTimeout(timeout);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('⏱️ User validation passed after:', Date.now() - startTime, 'ms');

    const {
      businessName,
      businessDescription,
      businessWebsite,
      businessPhone,
      businessEmail,
      businessLogo
    } = req.body;

    if (!businessName) {
      console.log('⚠️ No business name provided');
      clearTimeout(timeout);
      return res.status(400).json({ message: 'Business name is required' });
    }

    console.log('⏱️ About to check for existing business after:', Date.now() - startTime, 'ms');
    
    // Check if business already exists with timeout (12s instead of 8s)
    const existingCheckPromise = db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    const existingCheckTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout during existing business check')), 12000)
    );

    const existing = await Promise.race([existingCheckPromise, existingCheckTimeout]);

    console.log('⏱️ Existing business check completed after:', Date.now() - startTime, 'ms');

    if (Array.isArray(existing) && existing.length > 0) {
      console.log('⚠️ Business already exists for user:', userId);
      clearTimeout(timeout);
      return res.status(400).json({ message: 'Business profile already exists' });
    }

    console.log('⏱️ About to insert business profile after:', Date.now() - startTime, 'ms');
    console.log('🏢 Insert data:', { userId, businessName, businessDescription, businessWebsite, businessPhone, businessEmail, businessLogo });

    // Create business profile with timeout
    const insertPromise = db.insert(enterpriseBusinesses)
      .values({
        userId,
        businessName,
        businessDescription: businessDescription || null,
        businessWebsite: businessWebsite || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || null,
        businessLogo: businessLogo || null,
        businessType: 'company',
        verificationStatus: 'pending',
        isActive: true
      })
      .returning();

    const insertTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database insert timeout during business creation')), 20000)
    );

    const [business] = await Promise.race([insertPromise, insertTimeout]);

    console.log('✅ Business profile created successfully after:', Date.now() - startTime, 'ms');
    console.log('🏢 Created business:', business);
    
    clearTimeout(timeout);
    res.json(business);
  } catch (error) {
    console.error('❌ Error creating business profile after:', Date.now() - startTime, 'ms', error);
    clearTimeout(timeout);
    if (!res.headersSent) {
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Failed to create business profile';
      if (errorMessage.includes('timeout')) {
        res.status(408).json({ message: 'Database operation timed out. Please try again.' });
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        res.status(400).json({ message: 'Business profile already exists for this user.' });
      } else {
        res.status(500).json({ message: 'Failed to create business profile. Please try again.' });
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

// Get business statistics
export async function getBusinessStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Get stats
    const [positionStats] = await db.select({
      total: count(),
      active: count(sql`CASE WHEN ${enterprisePositions.isActive} = true THEN 1 END`)
    })
    .from(enterprisePositions)
    .where(eq(enterprisePositions.enterpriseId, business.id));

    const [applicationStats] = await db.select({
      total: count(),
      pending: count(sql`CASE WHEN ${enterpriseApplications.status} = 'pending' THEN 1 END`)
    })
    .from(enterpriseApplications)
    .where(eq(enterpriseApplications.enterpriseId, business.id));

    const [hubPinStats] = await db.select({
      total: count(),
      active: count(sql`CASE WHEN ${hubPins.isActive} = true THEN 1 END`)
    })
    .from(hubPins)
    .where(eq(hubPins.enterpriseId, business.id));

    // Calculate hired this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [hiredStats] = await db.select({
      count: count()
    })
    .from(enterpriseApplications)
    .where(
      and(
        eq(enterpriseApplications.enterpriseId, business.id),
        eq(enterpriseApplications.status, 'accepted'),
        sql`${enterpriseApplications.updatedAt} >= ${startOfMonth.toISOString()}`
      )
    );

    // Calculate average time to hire
    let averageTimeToHire = 0;
    try {
      const acceptedApplications = await db.select({
        dateApplied: enterpriseApplications.createdAt,
        dateAccepted: enterpriseApplications.updatedAt
      })
      .from(enterpriseApplications)
      .where(
        and(
          eq(enterpriseApplications.enterpriseId, business.id),
          eq(enterpriseApplications.status, 'accepted')
        )
      );

      if (acceptedApplications.length > 0) {
        const totalDays = acceptedApplications.reduce((sum, app) => {
          const applied = new Date(app.dateApplied);
          const accepted = new Date(app.dateAccepted);
          const diffDays = Math.ceil((accepted.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        averageTimeToHire = Math.round(totalDays / acceptedApplications.length);
      }
    } catch (error) {
      console.error('Error calculating average time to hire:', error);
    }

    res.json({
      totalPositions: positionStats.total,
      activePositions: positionStats.active,
      totalApplications: applicationStats.total,
      pendingApplications: applicationStats.pending,
      hiredThisMonth: hiredStats.count,
      averageTimeToHire: averageTimeToHire,
      totalHubPins: hubPinStats.total,
      activeHubPins: hubPinStats.active
    });
  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({ message: 'Failed to fetch business stats' });
  }
}

export async function getBusinessAnalytics(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Get application trends for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const applicationTrends = await db.select({
      month: sql<string>`TO_CHAR(${enterpriseApplications.createdAt}, 'Mon')`,
      applications: count(),
      hires: count(sql`CASE WHEN ${enterpriseApplications.status} = 'accepted' THEN 1 END`)
    })
    .from(enterpriseApplications)
    .where(
      and(
        eq(enterpriseApplications.enterpriseId, business.id),
        sql`${enterpriseApplications.createdAt} >= ${sixMonthsAgo.toISOString()}`
      )
    )
    .groupBy(sql`TO_CHAR(${enterpriseApplications.createdAt}, 'Mon'), EXTRACT(MONTH FROM ${enterpriseApplications.createdAt})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${enterpriseApplications.createdAt})`);

    // Get position performance
    const positionPerformance = await db.select({
      position: enterprisePositions.title,
      applications: count(enterpriseApplications.id),
      avgTimeToHire: sql<number>`COALESCE(AVG(EXTRACT(DAY FROM (${enterpriseApplications.updatedAt} - ${enterpriseApplications.createdAt}))), 0)`
    })
    .from(enterprisePositions)
    .leftJoin(enterpriseApplications, eq(enterprisePositions.id, enterpriseApplications.positionId))
    .where(eq(enterprisePositions.enterpriseId, business.id))
    .groupBy(enterprisePositions.id, enterprisePositions.title)
    .having(sql`COUNT(${enterpriseApplications.id}) > 0`);

    // Get application status breakdown
    const applicationStatus = await db.select({
      status: enterpriseApplications.status,
      count: count()
    })
    .from(enterpriseApplications)
    .where(eq(enterpriseApplications.enterpriseId, business.id))
    .groupBy(enterpriseApplications.status);

    // Transform status data for frontend
    const statusColors = {
      pending: '#FFBB28',
      'under_review': '#0088FE',
      accepted: '#00C49F',
      rejected: '#FF8042'
    };

    const formattedStatus = applicationStatus.map(item => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '),
      value: item.count,
      color: statusColors[item.status as keyof typeof statusColors] || '#8884D8'
    }));

    // Calculate top metrics
    const [totalStats] = await db.select({
      totalApplications: count(enterpriseApplications.id),
      acceptedApplications: count(sql`CASE WHEN ${enterpriseApplications.status} = 'accepted' THEN 1 END`),
      avgTimeToHire: sql<number>`COALESCE(AVG(EXTRACT(DAY FROM (${enterpriseApplications.updatedAt} - ${enterpriseApplications.createdAt}))), 0)`
    })
    .from(enterpriseApplications)
    .where(eq(enterpriseApplications.enterpriseId, business.id));

    const [activePositions] = await db.select({
      count: count()
    })
    .from(enterprisePositions)
    .where(
      and(
        eq(enterprisePositions.enterpriseId, business.id),
        eq(enterprisePositions.isActive, true)
      )
    );

    const acceptanceRate = totalStats.totalApplications > 0 
      ? Math.round((totalStats.acceptedApplications / totalStats.totalApplications) * 100)
      : 0;

    res.json({
      applicationTrends: applicationTrends.length > 0 ? applicationTrends : [],
      positionPerformance: positionPerformance.map(p => ({
        position: p.position,
        applications: p.applications,
        avgTimeToHire: Math.round(Number(p.avgTimeToHire))
      })),
      applicationStatus: formattedStatus,
      topMetrics: {
        totalApplications: totalStats.totalApplications,
        acceptanceRate,
        avgTimeToHire: Math.round(Number(totalStats.avgTimeToHire)),
        activePositions: activePositions.count
      }
    });
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ message: 'Failed to fetch business analytics' });
  }
}

// Get active hub pins for map display
export async function getActiveHubPins(req: Request, res: Response) {
  try {
    const { limit } = req.query as { limit?: string };
    const max = Math.min(parseInt(limit || '500'), 5000); // safeguard max 5000

    console.log('Fetching active hub pins...');

    const pins = await db.select({
      id: hubPins.id,
      title: hubPins.title,
      description: hubPins.description,
      location: hubPins.location,
      latitude: hubPins.latitude,
      longitude: hubPins.longitude,
      pinSize: hubPins.pinSize,
      pinColor: hubPins.pinColor,
      iconUrl: hubPins.iconUrl,
      priority: hubPins.priority,
      isActive: hubPins.isActive,
      business: {
        id: enterpriseBusinesses.id,
        businessName: enterpriseBusinesses.businessName,
        businessLogo: enterpriseBusinesses.businessLogo,
        verificationStatus: enterpriseBusinesses.verificationStatus
      }
    })
    .from(hubPins)
    .innerJoin(enterpriseBusinesses, eq(hubPins.enterpriseId, enterpriseBusinesses.id))
    .where(
      and(
        eq(hubPins.isActive, true),
        eq(enterpriseBusinesses.isActive, true),
        // Allow both verified and pending businesses to show hub pins
        or(
          eq(enterpriseBusinesses.verificationStatus, 'verified'),
          eq(enterpriseBusinesses.verificationStatus, 'pending')
        )
      )
    )
    .orderBy(desc(hubPins.priority))
    .limit(isNaN(max) ? 500 : max);

    res.json(pins);
    console.log(`Returned ${pins.length} active hub pins`);
  } catch (error) {
    console.error('Error fetching active hub pins:', error);
    res.status(500).json({ message: 'Failed to fetch hub pins' });
  }
}

// Get hub pin details with positions
export async function getHubPinDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const hubPinId = parseInt(id);

    const [hubPin] = await db.select()
      .from(hubPins)
      .where(eq(hubPins.id, hubPinId))
      .limit(1);

    if (!hubPin) {
      return res.status(404).json({ message: 'Hub pin not found' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.id, hubPin.enterpriseId))
      .limit(1);

    const positions = await db.select()
      .from(enterprisePositions)
      .where(
        and(
          eq(enterprisePositions.hubPinId, hubPinId),
          eq(enterprisePositions.isActive, true)
        )
      )
      .orderBy(desc(enterprisePositions.createdAt));

    res.json({
      hubPin,
      business,
      positions
    });
  } catch (error) {
    console.error('Error fetching hub pin details:', error);
    res.status(500).json({ message: 'Failed to fetch hub pin details' });
  }
}

// Create hub pin
export async function createHubPin(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const {
      title,
      description,
      location,
      latitude,
      longitude,
      pinSize,
      pinColor,
      iconUrl,
      priority
    } = req.body;

    console.log('Creating hub pin with data:', {
      title,
      location,
      latitude,
      longitude,
      latType: typeof latitude,
      lngType: typeof longitude,
      businessId: business.id
    });

    // Validate required fields
    if (!title || !location) {
      return res.status(400).json({ message: 'Title and location are required' });
    }

    // Validate coordinates
    if (!latitude || !longitude || typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.error('Invalid coordinates received:', { latitude, longitude });
      return res.status(400).json({ 
        message: 'Valid coordinates are required. Please select an address from the suggestions.' 
      });
    }

    // Check coordinate ranges
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      console.error('Coordinates out of range:', { latitude, longitude });
      return res.status(400).json({ 
        message: 'Coordinates are out of valid range.' 
      });
    }

    const [hubPin] = await db.insert(hubPins)
      .values({
        enterpriseId: business.id,
        title,
        description,
        location,
        latitude: parseFloat(latitude.toString()),
        longitude: parseFloat(longitude.toString()),
        pinSize: pinSize || 'large',
        pinColor: pinColor || '#FF6B6B',
        iconUrl,
        priority: priority || 1,
        isActive: true
      })
      .returning();

    console.log('Hub pin created successfully:', {
      id: hubPin.id,
      title: hubPin.title,
      latitude: hubPin.latitude,
      longitude: hubPin.longitude
    });

    res.json(hubPin);
  } catch (error) {
    console.error('Error creating hub pin:', error);
    res.status(500).json({ message: 'Failed to create hub pin' });
  }
}

// Create position
export async function createPosition(req: Request, res: Response) {
  try {
    console.log('🎯 Creating position - User ID:', req.user?.id);
    console.log('🎯 Request body:', JSON.stringify(req.body, null, 2));
    
    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      console.log('❌ No business found for user:', userId);
      return res.status(404).json({ message: 'Business profile not found. Please create your business profile first.' });
    }

    console.log('✅ Business found:', business.id, business.businessName);

    const {
      hubPinId,
      title,
      description,
      positionType,
      paymentType,
      paymentAmount,
      paymentFrequency,
      requiredSkills,
      benefits,
      schedule,
      positionsAvailable
    } = req.body;

    // Validate required fields
    if (!title || !description || !paymentAmount) {
      console.log('❌ Missing required fields:', { title: !!title, description: !!description, paymentAmount: !!paymentAmount });
      return res.status(400).json({ message: 'Title, description, and payment amount are required' });
    }

    if (paymentAmount <= 0) {
      console.log('❌ Invalid payment amount:', paymentAmount);
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    console.log('🎯 Creating position with data:', {
      enterpriseId: business.id,
      hubPinId,
      title,
      positionType,
      paymentType,
      paymentAmount,
      positionsAvailable: positionsAvailable || 1
    });

    const [position] = await db.insert(enterprisePositions)
      .values({
        enterpriseId: business.id,
        hubPinId,
        title,
        description,
        positionType,
        paymentType,
        paymentAmount,
        paymentFrequency,
        requiredSkills: requiredSkills || [],
        benefits,
        schedule,
        positionsAvailable: positionsAvailable || 1,
        isActive: true
      })
      .returning();

    console.log('✅ Position created successfully:', position.id, position.title);
    res.json(position);
  } catch (error) {
    console.error('❌ Error creating position:', error);
    res.status(500).json({ message: 'Failed to create position' });
  }
}

// Apply to position
export async function applyToPosition(req: Request, res: Response) {
  try {
    console.log('🎯 Position application started');
    console.log('🎯 User ID:', req.user?.id);
    console.log('🎯 Request params:', req.params);
    console.log('🎯 Request body:', JSON.stringify(req.body, null, 2));
    
    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const positionId = parseInt(id);
    const {
      coverLetter,
      expectedSalary,
      availableStartDate,
      quickApply
    } = req.body;

    console.log('🎯 Position ID:', positionId);
    console.log('🎯 Quick Apply:', quickApply);

    // Get position details
    const [position] = await db.select()
      .from(enterprisePositions)
      .where(eq(enterprisePositions.id, positionId))
      .limit(1);

    if (!position) {
      console.log('❌ Position not found:', positionId);
      return res.status(404).json({ message: 'Position not found' });
    }

    console.log('✅ Position found:', position.title);

    // Check if already applied
    const existing = await db.select()
      .from(enterpriseApplications)
      .where(
        and(
          eq(enterpriseApplications.positionId, positionId),
          eq(enterpriseApplications.applicantId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log('❌ User already applied to this position');
      return res.status(400).json({ message: 'Already applied to this position' });
    }

    console.log('✅ Creating new application...');

    const [application] = await db.insert(enterpriseApplications)
      .values({
        positionId,
        applicantId: userId,
        enterpriseId: position.enterpriseId,
        status: 'pending',
        coverLetter: quickApply ? 'Quick application' : coverLetter,
        expectedSalary,
        availableStartDate: availableStartDate ? new Date(availableStartDate).toISOString().split('T')[0] : null,
        notes: null
      })
      .returning();

    console.log('✅ Application created successfully:', application.id);
    res.json(application);
  } catch (error) {
    console.error('❌ Error applying to position:', error);
    res.status(500).json({ message: 'Failed to apply to position' });
  }
}

// Get applications for business
export async function getBusinessApplications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const applications = await db.select({
      id: enterpriseApplications.id,
      status: enterpriseApplications.status,
      coverLetter: enterpriseApplications.coverLetter,
      expectedSalary: enterpriseApplications.expectedSalary,
      availableStartDate: enterpriseApplications.availableStartDate,
      createdAt: enterpriseApplications.createdAt,
      position: {
        id: enterprisePositions.id,
        title: enterprisePositions.title
      },
      applicant: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        skills: users.skills,
        rating: users.rating
      }
    })
    .from(enterpriseApplications)
    .innerJoin(enterprisePositions, eq(enterpriseApplications.positionId, enterprisePositions.id))
    .innerJoin(users, eq(enterpriseApplications.applicantId, users.id))
    .where(eq(enterpriseApplications.enterpriseId, business.id))
    .orderBy(desc(enterpriseApplications.createdAt));

    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
}

// Update application status
export async function updateApplicationStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const applicationId = parseInt(id);
    const { status, notes } = req.body;

    // Verify ownership
    const [application] = await db.select()
      .from(enterpriseApplications)
      .innerJoin(enterpriseBusinesses, eq(enterpriseApplications.enterpriseId, enterpriseBusinesses.id))
      .where(
        and(
          eq(enterpriseApplications.id, applicationId),
          eq(enterpriseBusinesses.userId, userId)
        )
      )
      .limit(1);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const [updated] = await db.update(enterpriseApplications)
      .set({
        status,
        notes,
        reviewedBy: userId,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(enterpriseApplications.id, applicationId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Failed to update application status' });
  }
}

// Admin endpoints
// Get all enterprise businesses (admin only)
export async function getAllBusinesses(req: Request, res: Response) {
  try {
    // TODO: Add admin check
    const { search } = req.query as { search?: string };

    // Base query selecting relevant business information
    let query = db.select({
      id: enterpriseBusinesses.id,
      businessName: enterpriseBusinesses.businessName,
      businessEmail: enterpriseBusinesses.businessEmail,
      verificationStatus: enterpriseBusinesses.verificationStatus,
      isActive: enterpriseBusinesses.isActive,
      createdAt: enterpriseBusinesses.createdAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email
      },
      hubPinCount: sql<number>`(SELECT COUNT(*) FROM ${hubPins} WHERE ${hubPins.enterpriseId} = ${enterpriseBusinesses.id})`,
      activePositionCount: sql<number>`(SELECT COUNT(*) FROM ${enterprisePositions} WHERE ${enterprisePositions.enterpriseId} = ${enterpriseBusinesses.id} AND ${enterprisePositions.isActive} = true)`
    })
    .from(enterpriseBusinesses)
    .innerJoin(users, eq(enterpriseBusinesses.userId, users.id));

    if (search && search.trim() !== '') {
      query = query.where(ilike(enterpriseBusinesses.businessName, `%${search}%`));
    }

    const businesses = await query.orderBy(desc(enterpriseBusinesses.createdAt));

    res.json(businesses);
  } catch (error) {
    console.error('Error fetching all businesses:', error);
    res.status(500).json({ message: 'Failed to fetch businesses' });
  }
}

// Verify business (admin only)
export async function verifyBusiness(req: Request, res: Response) {
  try {
    // TODO: Add admin check
    const { id } = req.params;
    const businessId = parseInt(id);
    const { status } = req.body;

    const [updated] = await db.update(enterpriseBusinesses)
      .set({
        verificationStatus: status,
        updatedAt: new Date()
      })
      .where(eq(enterpriseBusinesses.id, businessId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error verifying business:', error);
    res.status(500).json({ message: 'Failed to verify business' });
  }
}

// Update business profile
export async function updateBusinessProfile(req: Request, res: Response) {
  console.log('🏢 Starting business profile UPDATE for user:', req.user?.id);
  console.log('🏢 UPDATE Request body:', JSON.stringify(req.body, null, 2));
  const startTime = Date.now();
  
  // Add request timeout handler
  const timeout = setTimeout(() => {
    console.error('⚠️ Business profile UPDATE timed out after 20 seconds');
    if (!res.headersSent) {
      res.status(408).json({ message: "Business profile update timed out. Please try again." });
    }
  }, 20000);
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log('⚠️ No user ID found in UPDATE request');
      clearTimeout(timeout);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('⏱️ UPDATE User validation passed after:', Date.now() - startTime, 'ms');

    const {
      businessName,
      businessDescription,
      businessWebsite,
      businessPhone,
      businessEmail,
      businessLogo,
      businessType
    } = req.body;

    if (!businessName) {
      console.log('⚠️ No business name provided in UPDATE');
      clearTimeout(timeout);
      return res.status(400).json({ message: 'Business name is required' });
    }

    console.log('⏱️ Updating business profile in database after:', Date.now() - startTime, 'ms');

    const [existing] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: 'Business profile not found' });
    }

    const [updated] = await db.update(enterpriseBusinesses)
      .set({
        businessName,
        businessDescription: businessDescription || null,
        businessWebsite: businessWebsite || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || null,
        businessLogo: businessLogo || null,
        businessType,
        updatedAt: new Date()
      })
      .where(eq(enterpriseBusinesses.userId, userId))
      .returning({ 
        id: enterpriseBusinesses.id,
        businessName: enterpriseBusinesses.businessName,
        businessDescription: enterpriseBusinesses.businessDescription,
        businessWebsite: enterpriseBusinesses.businessWebsite,
        businessPhone: enterpriseBusinesses.businessPhone,
        businessEmail: enterpriseBusinesses.businessEmail,
        businessType: enterpriseBusinesses.businessType,
        verificationStatus: enterpriseBusinesses.verificationStatus,
        isActive: enterpriseBusinesses.isActive,
        createdAt: enterpriseBusinesses.createdAt,
        updatedAt: enterpriseBusinesses.updatedAt
      });

    if (!updated) {
      console.log('⚠️ No business found to update for user:', userId);
      clearTimeout(timeout);
      return res.status(404).json({ message: 'Business not found' });
    }

    console.log('✅ Business profile updated successfully after:', Date.now() - startTime, 'ms');
    clearTimeout(timeout);
    res.json(updated);
  } catch (error) {
    console.error('❌ Error updating business profile after:', Date.now() - startTime, 'ms', error);
    clearTimeout(timeout);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to update business profile' });
    }
  } finally {
    clearTimeout(timeout);
  }
}

// Get hub pins for business
export async function getHubPins(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const pins = await db.select()
      .from(hubPins)
      .where(eq(hubPins.enterpriseId, business.id))
      .orderBy(desc(hubPins.createdAt));

    res.json(pins);
  } catch (error) {
    console.error('Error fetching hub pins:', error);
    res.status(500).json({ message: 'Failed to fetch hub pins' });
  }
}

// Update hub pin
export async function updateHubPin(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const hubPinId = parseInt(id);

    // Verify ownership
    const [hubPin] = await db.select()
      .from(hubPins)
      .innerJoin(enterpriseBusinesses, eq(hubPins.enterpriseId, enterpriseBusinesses.id))
      .where(
        and(
          eq(hubPins.id, hubPinId),
          eq(enterpriseBusinesses.userId, userId)
        )
      )
      .limit(1);

    if (!hubPin) {
      return res.status(404).json({ message: 'Hub pin not found' });
    }

    const {
      title,
      description,
      location,
      latitude,
      longitude,
      pinSize,
      pinColor,
      iconUrl,
      priority,
      isActive
    } = req.body;

    const [updated] = await db.update(hubPins)
      .set({
        title,
        description,
        location,
        latitude,
        longitude,
        pinSize,
        pinColor,
        iconUrl,
        priority,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(hubPins.id, hubPinId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating hub pin:', error);
    res.status(500).json({ message: 'Failed to update hub pin' });
  }
}

// Delete hub pin
export async function deleteHubPin(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const hubPinId = parseInt(id);

    // Verify ownership
    const [hubPin] = await db.select()
      .from(hubPins)
      .innerJoin(enterpriseBusinesses, eq(hubPins.enterpriseId, enterpriseBusinesses.id))
      .where(
        and(
          eq(hubPins.id, hubPinId),
          eq(enterpriseBusinesses.userId, userId)
        )
      )
      .limit(1);

    if (!hubPin) {
      return res.status(404).json({ message: 'Hub pin not found' });
    }

    await db.delete(hubPins).where(eq(hubPins.id, hubPinId));

    res.json({ message: 'Hub pin deleted successfully' });
  } catch (error) {
    console.error('Error deleting hub pin:', error);
    res.status(500).json({ message: 'Failed to delete hub pin' });
  }
}

// Get positions for business
export async function getPositions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const positions = await db.select()
      .from(enterprisePositions)
      .where(eq(enterprisePositions.enterpriseId, business.id))
      .orderBy(desc(enterprisePositions.createdAt));

    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Failed to fetch positions' });
  }
}

// Update position
export async function updatePosition(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const positionId = parseInt(id);

    // Verify ownership
    const [position] = await db.select()
      .from(enterprisePositions)
      .innerJoin(enterpriseBusinesses, eq(enterprisePositions.enterpriseId, enterpriseBusinesses.id))
      .where(
        and(
          eq(enterprisePositions.id, positionId),
          eq(enterpriseBusinesses.userId, userId)
        )
      )
      .limit(1);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    const {
      title,
      description,
      positionType,
      paymentType,
      paymentAmount,
      paymentFrequency,
      requiredSkills,
      benefits,
      schedule,
      positionsAvailable,
      isActive
    } = req.body;

    const [updated] = await db.update(enterprisePositions)
      .set({
        title,
        description,
        positionType,
        paymentType,
        paymentAmount,
        paymentFrequency,
        requiredSkills: requiredSkills || [],
        benefits,
        schedule,
        positionsAvailable,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(enterprisePositions.id, positionId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ message: 'Failed to update position' });
  }
}

// Delete position
export async function deletePosition(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const positionId = parseInt(id);

    // Verify ownership
    const [position] = await db.select()
      .from(enterprisePositions)
      .innerJoin(enterpriseBusinesses, eq(enterprisePositions.enterpriseId, enterpriseBusinesses.id))
      .where(
        and(
          eq(enterprisePositions.id, positionId),
          eq(enterpriseBusinesses.userId, userId)
        )
      )
      .limit(1);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

    await db.delete(enterprisePositions).where(eq(enterprisePositions.id, positionId));

    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ message: 'Failed to delete position' });
  }
} 
// Debug endpoint to check hub pins data
export async function debugHubPins(req: Request, res: Response) {
  try {
    // Get all hub pins regardless of status
    const allPins = await db.select({
      id: hubPins.id,
      title: hubPins.title,
      isActive: hubPins.isActive,
      latitude: hubPins.latitude,
      longitude: hubPins.longitude,
      enterpriseId: hubPins.enterpriseId,
      business: {
        id: enterpriseBusinesses.id,
        businessName: enterpriseBusinesses.businessName,
        isActive: enterpriseBusinesses.isActive,
        verificationStatus: enterpriseBusinesses.verificationStatus
      }
    })
    .from(hubPins)
    .leftJoin(enterpriseBusinesses, eq(hubPins.enterpriseId, enterpriseBusinesses.id));
    
    res.json({
      totalPins: allPins.length,
      activePins: allPins.filter(pin => pin.isActive).length,
      pinsWithCoordinates: allPins.filter(pin => pin.latitude && pin.longitude).length,
      businessStatuses: allPins.reduce((acc, pin) => {
        const status = pin.business?.verificationStatus || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      pins: allPins
    });
  } catch (error) {
    console.error('Error in debug hub pins:', error);
    res.status(500).json({ message: 'Failed to fetch hub pins debug data' });
  }
}
