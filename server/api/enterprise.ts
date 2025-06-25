import { Request, Response } from 'express';
import { db } from '../db';
import { 
  enterpriseBusinesses, 
  hubPins, 
  enterprisePositions, 
  enterpriseApplications,
  users 
} from '@shared/schema';
import { eq, and, desc, count, sql, isNull } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

// Get business profile for current user
export async function getBusinessProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [business] = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    res.json(business || null);
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({ message: 'Failed to fetch business profile' });
  }
}

// Create business profile
export async function createBusinessProfile(req: Request, res: Response) {
  console.log('🏢 Starting business profile creation for user:', req.user?.id);
  const startTime = Date.now();
  
  try {
    const userId = req.user?.id;
    if (!userId) {
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

    console.log('⏱️ Checking for existing business after:', Date.now() - startTime, 'ms');
    
    // Check if business already exists
    const existing = await db.select()
      .from(enterpriseBusinesses)
      .where(eq(enterpriseBusinesses.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      console.log('⚠️ Business already exists for user:', userId);
      return res.status(400).json({ message: 'Business profile already exists' });
    }

    console.log('⏱️ Creating business profile in database after:', Date.now() - startTime, 'ms');

    const [business] = await db.insert(enterpriseBusinesses)
      .values({
        userId,
        businessName,
        businessDescription,
        businessWebsite,
        businessPhone,
        businessEmail,
        businessLogo,
        businessType: 'company',
        verificationStatus: 'pending',
        isActive: true
      })
      .returning();

    console.log('✅ Business profile created successfully after:', Date.now() - startTime, 'ms');
    res.json(business);
  } catch (error) {
    console.error('❌ Error creating business profile after:', Date.now() - startTime, 'ms', error);
    res.status(500).json({ message: 'Failed to create business profile' });
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

    res.json({
      totalPositions: positionStats.total,
      activePositions: positionStats.active,
      totalApplications: applicationStats.total,
      pendingApplications: applicationStats.pending,
      hiredThisMonth: hiredStats.count,
      averageTimeToHire: 5, // TODO: Calculate actual average
      totalHubPins: hubPinStats.total,
      activeHubPins: hubPinStats.active
    });
  } catch (error) {
    console.error('Error fetching business stats:', error);
    res.status(500).json({ message: 'Failed to fetch business stats' });
  }
}

// Get active hub pins for map display
export async function getActiveHubPins(req: Request, res: Response) {
  try {
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
        eq(enterpriseBusinesses.isActive, true)
      )
    )
    .orderBy(desc(hubPins.priority));

    res.json(pins);
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

    const [hubPin] = await db.insert(hubPins)
      .values({
        enterpriseId: business.id,
        title,
        description,
        location,
        latitude,
        longitude,
        pinSize: pinSize || 'large',
        pinColor: pinColor || '#FF6B6B',
        iconUrl,
        priority: priority || 1,
        isActive: true
      })
      .returning();

    res.json(hubPin);
  } catch (error) {
    console.error('Error creating hub pin:', error);
    res.status(500).json({ message: 'Failed to create hub pin' });
  }
}

// Create position
export async function createPosition(req: Request, res: Response) {
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

    res.json(position);
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ message: 'Failed to create position' });
  }
}

// Apply to position
export async function applyToPosition(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
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

    // Get position details
    const [position] = await db.select()
      .from(enterprisePositions)
      .where(eq(enterprisePositions.id, positionId))
      .limit(1);

    if (!position) {
      return res.status(404).json({ message: 'Position not found' });
    }

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
      return res.status(400).json({ message: 'Already applied to this position' });
    }

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

    res.json(application);
  } catch (error) {
    console.error('Error applying to position:', error);
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
    const businesses = await db.select({
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
    .innerJoin(users, eq(enterpriseBusinesses.userId, users.id))
    .orderBy(desc(enterpriseBusinesses.createdAt));

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
        updatedAt: new Date().toISOString()
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
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      businessName,
      businessDescription,
      businessWebsite,
      businessPhone,
      businessEmail,
      businessLogo,
      businessType
    } = req.body;

    const [updated] = await db.update(enterpriseBusinesses)
      .set({
        businessName,
        businessDescription,
        businessWebsite,
        businessPhone,
        businessEmail,
        businessLogo,
        businessType,
        updatedAt: new Date().toISOString()
      })
      .where(eq(enterpriseBusinesses.userId, userId))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ message: 'Failed to update business profile' });
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
        updatedAt: new Date().toISOString()
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
        updatedAt: new Date().toISOString()
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