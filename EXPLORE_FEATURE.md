# Explore Feature Documentation

## Overview
The Explore feature allows users to discover nearby jobs and business hub pins in their area. This feature is accessible through the "Explore" button in the UserDrawerV2 component.

## Features

### 🔍 **Search & Discovery**
- **Nearby Jobs**: Shows open jobs within a 25-mile radius
- **Hub Pins**: Displays active business hub pins from verified and pending businesses
- **Real-time Location**: Uses user's current location or stored coordinates
- **Distance Calculation**: Shows exact distance to each opportunity

### 🎯 **Filtering & Sorting**
- **Filter by Type**: All, Jobs only, or Hub Pins only
- **Search**: Text search across titles, descriptions, and business names
- **Sort Options**: 
  - Distance (closest first)
  - Date (newest first)
  - Amount (highest paying first)

### 📱 **Interactive Interface**
- **Job Details Modal**: Click "View Details" to see full job information
- **Hub Pin Details Modal**: Click "View Hub" to see business information
- **Navigation Integration**: "View Full Details" redirects to main map with selected item
- **Responsive Design**: Works on desktop and mobile devices

## Technical Implementation

### Frontend Components
- **Location**: `/client/src/pages/Explore.tsx`
- **Route**: `/explore` (protected route)
- **Dependencies**: 
  - React hooks for state management
  - Wouter for navigation
  - Shadcn/ui components for UI
  - Lucide React for icons

### Backend API Endpoints
- **Nearby Jobs**: `GET /api/jobs/nearby?latitude={lat}&longitude={lng}&radius={miles}`
- **Active Hub Pins**: `GET /api/enterprise/hub-pins/active`

### Key Features
1. **Geolocation Integration**: Automatically detects user location
2. **Distance Calculation**: Uses Haversine formula for accurate distance
3. **Real-time Data**: Fetches fresh data on each visit
4. **Error Handling**: Graceful fallbacks for location and API errors

## Usage

### For Users
1. Click the "Explore" button in the user drawer
2. Allow location access when prompted (optional)
3. Browse nearby opportunities
4. Use search and filters to find specific items
5. Click "View Details" or "View Hub" for more information
6. Navigate to full details or map view as needed

### For Developers
```typescript
// The main component structure
export default function Explore() {
  // State management for items, filters, and modals
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'jobs' | 'hubpins'>('all');
  
  // Location detection and API calls
  useEffect(() => {
    // Get user location and fetch nearby items
  }, [userLocation]);
  
  // Render cards and modals
  return (
    // UI components with search, filters, and results
  );
}
```

## API Response Format

### Nearby Jobs Response
```json
[
  {
    "id": 123,
    "title": "Fix Kitchen Sink",
    "description": "Need help fixing a leaky kitchen sink...",
    "category": "Plumbing",
    "status": "open",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "location": "New York, NY",
    "paymentAmount": 150,
    "paymentType": "fixed",
    "estimatedHours": 2,
    "datePosted": "2024-01-15T10:00:00Z",
    "equipmentProvided": true
  }
]
```

### Hub Pins Response
```json
[
  {
    "id": 456,
    "title": "Downtown Repair Hub",
    "description": "Full-service repair center...",
    "location": "123 Main St, New York, NY",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "business": {
      "id": 789,
      "businessName": "NYC Repairs Inc",
      "businessLogo": "https://...",
      "verificationStatus": "verified"
    }
  }
]
```

## Configuration

### Environment Variables
- Uses existing location and API configurations
- No additional environment variables required

### Permissions
- **Location Access**: Optional but recommended for best experience
- **Authentication**: Requires user to be logged in (protected route)

## Future Enhancements

### Planned Features
1. **Map Integration**: Interactive map view showing all items
2. **Favorites**: Save interesting jobs and hub pins
3. **Notifications**: Alert users about new opportunities nearby
4. **Advanced Filters**: Price range, skills, availability
5. **Social Features**: Reviews and ratings for hub pins

### Performance Optimizations
1. **Caching**: Cache results for better performance
2. **Pagination**: Load more results on demand
3. **Background Updates**: Refresh data periodically
4. **Offline Support**: Show cached results when offline

## Testing

### Manual Testing Checklist
- [ ] Page loads without errors
- [ ] Location detection works
- [ ] Search functionality works
- [ ] Filters apply correctly
- [ ] Sorting works as expected
- [ ] Job details modal opens and displays correctly
- [ ] Hub pin details modal opens and displays correctly
- [ ] Navigation to main app works
- [ ] Responsive design works on mobile

### API Testing
```bash
# Test nearby jobs endpoint
curl "http://localhost:5000/api/jobs/nearby?latitude=40.7128&longitude=-74.0060&radius=25"

# Test hub pins endpoint
curl "http://localhost:5000/api/enterprise/hub-pins/active"
```

## Troubleshooting

### Common Issues
1. **No location detected**: User denied permission or browser doesn't support geolocation
2. **No results found**: No jobs/hub pins in the area or API issues
3. **Slow loading**: Large number of results or slow API response

### Solutions
1. **Location fallback**: Use user's stored coordinates or default location
2. **Empty state**: Show helpful message and suggestions
3. **Loading states**: Show spinners and progress indicators

## Integration Points

### UserDrawerV2 Integration
The explore button in UserDrawerV2 navigates to `/explore`:
```typescript
<Button onClick={() => navigateTo('/explore')}>
  <Scroll className="h-3 w-3" />
  Explore
</Button>
```

### Main App Integration
Results can navigate back to the main app with specific items selected:
```typescript
// Navigate to main map with job selected
navigate(`/?jobId=${selectedJob.id}`);

// Navigate to main map with hub pin selected
navigate(`/?hubPinId=${selectedHubPin.id}`);
```

This creates a seamless experience between the explore feature and the main application.
