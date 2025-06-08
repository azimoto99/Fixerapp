/**
 * Test script for profile image upload functionality
 * Run this in the browser console after logging in
 */

async function testProfileImageUpload() {
  console.log('=== Profile Image Upload Test ===');
  
  try {
    // Test 1: Check if user is authenticated
    console.log('1. Checking authentication...');
    const userResponse = await fetch('/api/user', { credentials: 'include' });
    
    if (!userResponse.ok) {
      console.log('✗ User not authenticated');
      return;
    }
    
    const user = await userResponse.json();
    console.log('✓ User authenticated:', user.username);
    
    // Test 2: Create a test image data (1x1 pixel red PNG)
    console.log('2. Creating test image data...');
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    // Test 3: Test the profile image upload endpoint
    console.log('3. Testing profile image upload endpoint...');
    const uploadResponse = await fetch(`/api/users/${user.id}/profile-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageData: testImageData }),
      credentials: 'include'
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log('✗ Upload failed:', uploadResponse.status, errorText);
      return;
    }
    
    const updatedUser = await uploadResponse.json();
    console.log('✓ Upload successful:', updatedUser);
    
    // Test 4: Verify the image was saved
    console.log('4. Verifying image was saved...');
    if (updatedUser.avatarUrl === testImageData) {
      console.log('✓ Image data saved correctly');
    } else {
      console.log('⚠ Image data differs from expected');
      console.log('Expected:', testImageData.substring(0, 50) + '...');
      console.log('Actual:', updatedUser.avatarUrl?.substring(0, 50) + '...');
    }
    
    console.log('=== Test Complete ===');
    
  } catch (error) {
    console.log('✗ Test failed with error:', error);
  }
}

// Run the test
testProfileImageUpload(); 