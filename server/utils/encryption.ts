import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32
};

// Get encryption key from environment or generate one
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set in environment. Using generated key (not suitable for production)');
    return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  }
  
  // If key is base64 encoded, decode it
  if (key.length === 44 && key.endsWith('=')) {
    return Buffer.from(key, 'base64');
  }
  
  // If key is hex encoded
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Derive key from string using PBKDF2
  const salt = Buffer.from('fixer-app-salt', 'utf8'); // In production, use unique salt per installation
  return crypto.pbkdf2Sync(key, salt, 100000, ENCRYPTION_CONFIG.keyLength, 'sha256');
};

const ENCRYPTION_KEY = getEncryptionKey();

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  algorithm: string;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptSensitiveData(data: string): EncryptedData {
  if (!data) {
    throw new Error('Data to encrypt cannot be empty');
  }

  const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
  const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('fixer-app-aad')); // Additional authenticated data
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    algorithm: ENCRYPTION_CONFIG.algorithm
  };
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedData: EncryptedData): string {
  if (!encryptedData || !encryptedData.encrypted) {
    throw new Error('Invalid encrypted data');
  }

  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');
  
  const decipher = crypto.createDecipher(encryptedData.algorithm, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('fixer-app-aad'));
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash sensitive data for storage (one-way)
 */
export function hashSensitiveData(data: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(ENCRYPTION_CONFIG.saltLength).toString('base64');
  const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha256').toString('base64');
  
  return { hash, salt: actualSalt };
}

/**
 * Verify hashed data
 */
export function verifySensitiveData(data: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashSensitiveData(data, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
}

/**
 * Encrypt location coordinates
 */
export function encryptLocation(latitude: number, longitude: number): EncryptedData {
  const locationData = JSON.stringify({ lat: latitude, lng: longitude, timestamp: Date.now() });
  return encryptSensitiveData(locationData);
}

/**
 * Decrypt location coordinates
 */
export function decryptLocation(encryptedLocation: EncryptedData): { lat: number; lng: number; timestamp: number } {
  const decrypted = decryptSensitiveData(encryptedLocation);
  return JSON.parse(decrypted);
}

/**
 * Encrypt payment information
 */
export function encryptPaymentData(paymentInfo: {
  cardLast4?: string;
  paymentMethodId?: string;
  customerId?: string;
}): EncryptedData {
  const paymentData = JSON.stringify({
    ...paymentInfo,
    timestamp: Date.now()
  });
  return encryptSensitiveData(paymentData);
}

/**
 * Decrypt payment information
 */
export function decryptPaymentData(encryptedPayment: EncryptedData): any {
  const decrypted = decryptSensitiveData(encryptedPayment);
  return JSON.parse(decrypted);
}

/**
 * Encrypt personal information (phone, address, etc.)
 */
export function encryptPersonalInfo(info: string): EncryptedData {
  return encryptSensitiveData(info);
}

/**
 * Decrypt personal information
 */
export function decryptPersonalInfo(encryptedInfo: EncryptedData): string {
  return decryptSensitiveData(encryptedInfo);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash password with salt (for authentication)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return `${hash.toString('hex')}.${salt}`;
}

/**
 * Verify password hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [hash, salt] = storedHash.split('.');
  const hashBuffer = Buffer.from(hash, 'hex');
  
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  
  return crypto.timingSafeEqual(hashBuffer, derivedKey);
}

/**
 * Encrypt data for database storage
 */
export function encryptForDatabase(data: any): string {
  const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
  const encrypted = encryptSensitiveData(jsonData);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt data from database storage
 */
export function decryptFromDatabase(encryptedString: string): any {
  try {
    const encryptedData = JSON.parse(encryptedString);
    const decrypted = decryptSensitiveData(encryptedData);
    
    // Try to parse as JSON, if it fails return as string
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('Failed to decrypt database data:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'credit_card', 'ssn', 
    'social_security', 'phone', 'email', 'address', 'location',
    'coordinates', 'lat', 'lng', 'latitude', 'longitude'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      if (typeof sanitized[field] === 'string') {
        // Show first 2 and last 2 characters for strings
        const value = sanitized[field];
        sanitized[field] = value.length > 4 
          ? `${value.substring(0, 2)}***${value.substring(value.length - 2)}`
          : '***';
      } else {
        sanitized[field] = '[REDACTED]';
      }
    }
  }
  
  return sanitized;
}

/**
 * Generate encryption key for new installations
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength).toString('base64');
}

export default {
  encryptSensitiveData,
  decryptSensitiveData,
  hashSensitiveData,
  verifySensitiveData,
  encryptLocation,
  decryptLocation,
  encryptPaymentData,
  decryptPaymentData,
  encryptPersonalInfo,
  decryptPersonalInfo,
  generateSecureToken,
  hashPassword,
  verifyPassword,
  encryptForDatabase,
  decryptFromDatabase,
  sanitizeForLogging,
  generateEncryptionKey
}; 