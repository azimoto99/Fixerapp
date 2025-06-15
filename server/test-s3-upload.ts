import './env';
import { uploadProfileImage, uploadFile, validateImageFile, base64ToBuffer } from './services/s3Service.js';
import fs from 'fs';
import path from 'path';

async function testS3Upload() {
  console.log('🧪 Testing S3 Upload Service...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'Not set'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set'}`);
  console.log(`S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || 'Not set'}\n`);

  if (!process.env.S3_BUCKET_NAME) {
    console.error('❌ S3_BUCKET_NAME environment variable is required');
    process.exit(1);
  }

  try {
    // Test 1: Create a test image buffer
    console.log('🎨 Test 1: Creating test image...');
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    console.log('✅ Test image created (1x1 PNG)\n');

    // Test 2: Validate image
    console.log('🔍 Test 2: Validating image...');
    try {
      validateImageFile(testImageBuffer);
      console.log('✅ Image validation passed\n');
    } catch (error) {
      console.error('❌ Image validation failed:', error);
      return;
    }

    // Test 3: Upload profile image
    console.log('☁️ Test 3: Uploading profile image to S3...');
    const userId = 999; // Test user ID
    const uploadResult = await uploadProfileImage(userId, testImageBuffer, 'test-image.png');
    
    console.log('✅ Upload successful!');
    console.log(`📍 URL: ${uploadResult.url}`);
    console.log(`🔑 Key: ${uploadResult.key}`);
    console.log(`📏 Size: ${uploadResult.size} bytes\n`);

    // Test 4: Test base64 conversion
    console.log('🔄 Test 4: Testing base64 conversion...');
    const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const convertedBuffer = base64ToBuffer(base64Data);
    console.log(`✅ Base64 conversion successful: ${convertedBuffer.length} bytes\n`);

    // Test 5: Upload general file
    console.log('📄 Test 5: Uploading general file...');
    const textBuffer = Buffer.from('Hello, S3!', 'utf-8');
    const fileResult = await uploadFile(textBuffer, 'test.txt', 'text/plain', 'test-files');
    
    console.log('✅ File upload successful!');
    console.log(`📍 URL: ${fileResult.url}`);
    console.log(`🔑 Key: ${fileResult.key}`);
    console.log(`📏 Size: ${fileResult.size} bytes\n`);

    console.log('🎉 All tests passed! S3 upload service is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('1. Test profile image upload through the web interface');
    console.log('2. Verify images are accessible via the returned URLs');
    console.log('3. Check S3 bucket for uploaded files');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        console.log('\n💡 Tip: Check your AWS credentials in .env file');
      } else if (error.message.includes('bucket')) {
        console.log('\n💡 Tip: Verify your S3 bucket name and permissions');
      } else if (error.message.includes('region')) {
        console.log('\n💡 Tip: Check your AWS region setting');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testS3Upload().catch(console.error);
