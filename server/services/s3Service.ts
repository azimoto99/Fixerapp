import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import sharp from 'sharp';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export function base64ToBuffer(base64: string): Buffer {
    const regex = /^data:.+\/(.+);base64,(.*)$/;
    const matches = base64.match(regex);
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
    }
    return Buffer.from(matches[2], 'base64');
}

export async function validateImageFile(file: Buffer | File) {
    const buffer = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
    
    // Check file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
        throw new Error(`File size exceeds the limit of ${maxSize / 1024 / 1024}MB.`);
    }

    // Check file type using sharp
    try {
        const metadata = await sharp(buffer).metadata();
        const allowedFormats = ['jpeg', 'png', 'webp', 'gif'];
        if (!metadata.format || !allowedFormats.includes(metadata.format)) {
            throw new Error('Invalid image format. Only JPEG, PNG, WEBP, and GIF are allowed.');
        }
    } catch (error) {
        throw new Error('Could not read image metadata. The file may be corrupt or not a valid image.');
    }
}

export async function resizeImage(fileBuffer: Buffer, width: number, height: number, quality: number): Promise<Buffer> {
    try {
        return await sharp(fileBuffer)
            .resize(width, height, { fit: 'cover' })
            .jpeg({ quality })
            .toBuffer();
    } catch (error) {
        console.error("Error resizing image:", error);
        throw new Error("Failed to resize image.");
    }
}

export async function uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = 'general'
) {
    const key = `${folder}/${Date.now()}_${randomBytes(8).toString('hex')}_${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
    });

    await s3Client.send(command);

    return {
        key,
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        size: buffer.length,
    };
}

export async function uploadProfileImage(userId: number, imageBuffer: Buffer, fileName: string) {
    const resizedBuffer = await resizeImage(imageBuffer, 400, 400, 90);
    const metadata = await sharp(resizedBuffer).metadata();
    const contentType = `image/${metadata.format}`;
    
    return uploadFile(resizedBuffer, fileName, contentType, `avatars/user-${userId}`);
}

export async function getPresignedUploadUrl(userId: number, fileName: string, fileType: string) {
    const key = `avatars/user-${userId}/${Date.now()}_${randomBytes(8).toString('hex')}_${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: fileType,
        ACL: 'public-read',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
        signedUrl,
        key,
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    };
} 