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
