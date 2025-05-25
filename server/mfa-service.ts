import crypto from 'crypto';
import { storage } from './storage';

// Multi-Factor Authentication Service for Plan Bravo Security Enhancement
export class MFAService {
  private static instance: MFAService;
  private totpSecrets = new Map<number, string>();
  private backupCodes = new Map<number, string[]>();

  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  // Generate TOTP secret for user
  async generateTOTPSecret(userId: number): Promise<string> {
    const secret = crypto.randomBytes(32).toString('base64');
    this.totpSecrets.set(userId, secret);
    
    // Store in database for persistence
    try {
      await storage.updateUser(userId, {
        mfaSecret: secret,
        mfaEnabled: false // User needs to verify setup first
      });
    } catch (error) {
      console.error('Error storing MFA secret:', error);
    }
    
    return secret;
  }

  // Generate backup codes for emergency access
  async generateBackupCodes(userId: number): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(6).toString('hex').toUpperCase()
    );
    
    this.backupCodes.set(userId, codes);
    
    // Store hashed backup codes in database
    try {
      const hashedCodes = codes.map(code => crypto.createHash('sha256').update(code).digest('hex'));
      await storage.updateUser(userId, {
        mfaBackupCodes: hashedCodes
      });
    } catch (error) {
      console.error('Error storing backup codes:', error);
    }
    
    return codes;
  }

  // Simple TOTP implementation (6-digit codes, 30-second window)
  generateTOTP(secret: string, timeStep: number = Math.floor(Date.now() / 30000)): string {
    const key = Buffer.from(secret, 'base64');
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(timeStep));
    
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    ) % 1000000;
    
    return code.toString().padStart(6, '0');
  }

  // Verify TOTP code with time tolerance
  async verifyTOTP(userId: number, userCode: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.mfaSecret) {
        return false;
      }

      const currentTime = Math.floor(Date.now() / 30000);
      
      // Check current time and ±1 time step for clock drift tolerance
      for (let i = -1; i <= 1; i++) {
        const validCode = this.generateTOTP(user.mfaSecret, currentTime + i);
        if (validCode === userCode) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  // Verify backup code
  async verifyBackupCode(userId: number, userCode: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.mfaBackupCodes) {
        return false;
      }

      const hashedCode = crypto.createHash('sha256').update(userCode.toUpperCase()).digest('hex');
      const isValid = user.mfaBackupCodes.includes(hashedCode);
      
      if (isValid) {
        // Remove used backup code
        const updatedCodes = user.mfaBackupCodes.filter(code => code !== hashedCode);
        await storage.updateUser(userId, {
          mfaBackupCodes: updatedCodes
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  // Enable MFA for user after successful setup verification
  async enableMFA(userId: number): Promise<boolean> {
    try {
      await storage.updateUser(userId, {
        mfaEnabled: true
      });
      return true;
    } catch (error) {
      console.error('Error enabling MFA:', error);
      return false;
    }
  }

  // Disable MFA for user
  async disableMFA(userId: number): Promise<boolean> {
    try {
      await storage.updateUser(userId, {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null
      });
      
      this.totpSecrets.delete(userId);
      this.backupCodes.delete(userId);
      return true;
    } catch (error) {
      console.error('Error disabling MFA:', error);
      return false;
    }
  }

  // Check if user has MFA enabled
  async isMFAEnabled(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user?.mfaEnabled === true;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }
}

export const mfaService = MFAService.getInstance();