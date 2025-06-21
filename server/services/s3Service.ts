import { S3Client, PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";
import crypto from 'crypto';

// Configure S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: fromEnv(),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

if (!BUCKET_NAME) {
    console.warn('S3_BUCKET_NAME environment variable is not set. File uploads will fail.');
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
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const key = `${folder}/${Date.now()}-${randomBytes}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read' // Make file publicly readable
    });

    await s3Client.send(command);

    return {
        url: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
        key,
        size: buffer.length
    };
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