# Hub Pin Logo Upload & Size Fixes

## Issues Fixed

### 1. **Logo Upload Functionality**
- **Problem**: No way to upload custom logos for hub pins
- **Solution**: Added comprehensive logo upload system
- **Features**:
  - File upload with drag & drop support
  - Image preview before submission
  - File type validation (JPEG, PNG, GIF, WebP)
  - File size validation (5MB limit)
  - S3 integration for secure storage
  - Logo removal functionality

### 2. **Hub Pin Size Reduction**
- **Problem**: Hub pins were too large (100px base size)
- **Solution**: Reduced pin sizes for better map visibility
- **Changes**:
  - Small: 45px (was part of 100px+ system)
  - Medium: 60px (new default)
  - Large: 75px (reduced from 100px+)
  - Removed pulsing animation to reduce visual noise

### 3. **Logo Display on Map**
- **Problem**: Logos weren't displayed on hub pins
- **Solution**: Enhanced map rendering to show uploaded logos
- **Features**:
  - Logo appears as background image on hub pins
  - Fallback to emoji icon if no logo
  - Proper scaling and positioning
  - Maintains pin styling and colors

## Key Changes Made

### 1. HubPinManager.tsx
```typescript
// Added logo upload state and handlers
const [logoFile, setLogoFile] = useState<File | null>(null);
const [logoPreview, setLogoPreview] = useState<string>(pin?.iconUrl || '');
const [isUploadingLogo, setIsUploadingLogo] = useState(false);

// File validation and upload
const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Validates file type and size
  // Creates preview
};

const uploadLogo = async (): Promise<string | null> => {
  // Uploads to S3 via API
  // Returns logo URL
};

// Updated form submission
const handleSubmit = async (e: React.FormEvent) => {
  // Upload logo if new file selected
  // Submit form with logo URL
};
```

### 2. Server-side (enterprise.ts)
```typescript
// Added multer configuration for logo uploads
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    // Validation logic
  }
});

// Logo upload endpoint
export async function uploadEnterpriseLogo(req: Request, res: Response) {
  // Validates user authentication
  // Uploads to S3 with unique filename
  // Returns logo URL
}
```

### 3. Map Pin Styles (mapPinStyles.ts)
```typescript
// Reduced enterprise pin sizes
const getEnterprisePinStyle = (config: PinConfig, isDark: boolean = false): PinStyle => {
  let baseSize = 60; // Reduced from 100
  
  if (config.category === 'small') baseSize = 45;
  else if (config.category === 'medium') baseSize = 60;
  else if (config.category === 'large') baseSize = 75;
  
  return {
    // ... other properties
    size: baseSize + (config.priority || 0) * 8, // Reduced multiplier
    pulse: false // Disabled pulsing
  };
};
```

### 4. Map Rendering (MapboxMap.tsx)
```typescript
// Enhanced enterprise pin rendering with logo support
const logoUrl = (marker as any).enterpriseIcon && (marker as any).enterpriseIcon.startsWith('http') 
  ? (marker as any).enterpriseIcon 
  : null;

// Pin HTML with conditional logo background
<div style="
  background-color: ${pinStyle.backgroundColor};
  ${logoUrl ? `background-image: url(${logoUrl}); background-size: 70%; background-position: center; background-repeat: no-repeat;` : ''}
  // ... other styles
">
  ${logoUrl ? '' : pinStyle.icon}
</div>
```

## UI Components Added

### Logo Upload Section
- **File Input**: Hidden file input with custom button trigger
- **Preview**: Shows uploaded image with remove option
- **Validation**: Real-time file type and size validation
- **Progress**: Upload progress indication
- **Error Handling**: Clear error messages for failed uploads

### Pin Size Options
- **Small**: 45px - For subtle location marking
- **Medium**: 60px - Default balanced size
- **Large**: 75px - For prominent locations

## API Endpoints

### POST `/api/enterprise/upload-logo`
- **Purpose**: Upload enterprise logo files
- **Authentication**: Required (user must be logged in)
- **File Limits**: 5MB max, image types only
- **Response**: `{ message: string, logoUrl: string }`

## File Structure
```
enterprise-logos/           # S3 folder for logo storage
├── enterprise-logo-{userId}-{timestamp}.{ext}
└── ...
```

## Testing Steps

### 1. Logo Upload Test
1. Go to Enterprise Dashboard → Hub Pins
2. Click "Create Hub Pin" or edit existing pin
3. Click "Upload Logo" button
4. Select an image file (JPEG, PNG, GIF, WebP)
5. Verify preview appears
6. Submit form
7. Check that logo appears on map pin

### 2. Size Validation Test
1. Try uploading file > 5MB → Should show error
2. Try uploading non-image file → Should show error
3. Upload valid image → Should work

### 3. Map Display Test
1. Create hub pin with logo
2. View map
3. Verify logo appears on hub pin
4. Verify pin size is reasonable (not too large)
5. Test different pin sizes (small, medium, large)

## Current Status: ✅ READY

The hub pin system now supports:
- ✅ Logo upload with validation
- ✅ Logo display on map pins
- ✅ Reasonable pin sizes
- ✅ File type and size validation
- ✅ S3 integration for storage
- ✅ Preview and removal functionality
- ✅ Error handling and user feedback

## Benefits

1. **Professional Appearance**: Businesses can use their actual logos
2. **Better Map Visibility**: Reduced pin sizes don't overwhelm the map
3. **User Experience**: Easy upload process with validation
4. **Scalability**: S3 storage handles large numbers of logos
5. **Flexibility**: Multiple size options for different use cases

The hub pin system is now production-ready with professional logo support and optimal sizing! 🎯
