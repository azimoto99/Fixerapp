import { S3Client, PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";
import crypto from 'crypto';

// Configure S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: fromEnv(),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

if (!BUCKET_NAME) {
    console.warn('S3_BUCKET_NAME environment variable is not set. File uploads will use fallback.');
}

// Check if AWS credentials are available
const hasAWSCredentials = () => {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) || 
           !!(process.env.AWS_PROFILE) ||
           !!(process.env.AWS_ROLE_ARN);
};

if (!hasAWSCredentials()) {
    console.warn('AWS credentials not found. File uploads will use fallback.');
}

/**
 * Validates an image file buffer.
 * @param buffer The image buffer.
 * @param maxSize The maximum file size in bytes.
 */
export function validateImageFile(buffer: Buffer, maxSize: number = 5 * 1024 * 1024) {
    if (buffer.length > maxSize) {
        throw new Error(`Image must be smaller than ${maxSize / 1024 / 1024}MB`);
    }

    // Basic magic number check for common image types
    const magic = buffer.toString('hex', 0, 4);
    const isJpg = magic.startsWith('ffd8ff');
    const isPng = magic === '89504e47';
    const isGif = magic.startsWith('47494638');
    const isWebP = buffer.toString('utf8', 8, 12) === 'WEBP';

    if (!isJpg && !isPng && !isGif && !isWebP) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }
}

/**
 * Converts a base64 data URI to a Buffer.
 * @param base64Data The base64 data URI (e.g., "data:image/png;base64,...").
 * @returns A Buffer containing the image data.
 */
export function base64ToBuffer(base64Data: string): Buffer {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
    }
    return Buffer.from(matches[2], 'base64');
}

/**
 * Uploads a file to S3.
 * @param buffer The file buffer.
 * @param fileName The original file name.
 * @param contentType The MIME type of the file.
 * @param folder The folder within the bucket to upload to.
 * @returns The URL of the uploaded file, the S3 key, and the file size.
 */
export async function uploadFile(buffer: Buffer, fileName: string, contentType: string, folder: string = 'uploads') {
    if (!BUCKET_NAME) {
        throw new Error('S3 bucket not configured. Please set S3_BUCKET_NAME environment variable.');
    }

    if (!hasAWSCredentials()) {
        throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    }

    try {
        const randomBytes = crypto.randomBytes(16).toString('hex');
        const key = `${folder}/${Date.now()}-${randomBytes}-${fileName}`;

        console.log('Uploading to S3:', { bucket: BUCKET_NAME, key, contentType, size: buffer.length });

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read' // Make file publicly readable
        });

        await s3Client.send(command);

        const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
        console.log('S3 upload successful:', url);

        return {
            url,
            key,
            size: buffer.length
        };
    } catch (error) {
        console.error('S3 upload failed:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('credentials')) {
                throw new Error('AWS credentials are invalid or expired');
            } else if (error.message.includes('NoSuchBucket')) {
                throw new Error(`S3 bucket '${BUCKET_NAME}' does not exist`);
            } else if (error.message.includes('AccessDenied')) {
                throw new Error('Access denied to S3 bucket. Check your AWS permissions.');
            }
        }
        
        throw error;
    }
}

/**
 * Uploads a user's profile image to S3.
 * @param userId The ID of the user.
 * @param imageBuffer The image buffer.
 * @param fileName The original file name of the image.
 * @returns The URL of the uploaded image, the S3 key, and the image size.
 */
export async function uploadProfileImage(userId: number, imageBuffer: Buffer, fileName: string) {
    validateImageFile(imageBuffer);
    
    // Determine content type from file extension
    const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
    const contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    return uploadFile(imageBuffer, `avatar-${userId}.${extension}`, contentType, `avatars/${userId}`);
} 