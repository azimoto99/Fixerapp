#!/usr/bin/env ts-node

/**
 * Security Audit Script for Fixer App
 * 
 * This script performs comprehensive security checks including:
 * - Authentication token validation
 * - Session management verification 
 * - Database security analysis
 * - API endpoint security assessment
 * - File upload security validation
 * - Environment variable security check
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

interface SecurityIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
}

interface SecurityReport {
  issues: SecurityIssue[];
  summary: {
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  overallScore: number;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];
  private baseDir: string;

  constructor() {
    this.baseDir = process.cwd();
  }

  /**
   * Run comprehensive security audit
   */
  async runAudit(): Promise<SecurityReport> {
    console.log('🔒 Starting Security Audit for Fixer App...\n');

    // Run all security checks
    await this.checkAuthentication();
    await this.checkSessionManagement();
    await this.checkDatabaseSecurity();
    await this.checkAPIEndpoints();
    await this.checkFileUploads();
    await this.checkEnvironmentVariables();
    await this.checkEncryption();
    await this.checkInputValidation();
    await this.checkRateLimiting();
    await this.checkCORSConfiguration();

    return this.generateReport();
  }

  /**
   * Check authentication implementation
   */
  private async checkAuthentication(): Promise<void> {
    console.log('🔐 Checking Authentication Security...');

    // Check password hashing
    await this.checkPasswordHashing();
    
    // Check session token generation
    await this.checkTokenGeneration();
    
    // Check authentication middleware
    await this.checkAuthMiddleware();
    
    // Check admin authentication
    await this.checkAdminAuth();
  }

  private async checkPasswordHashing(): Promise<void> {
    const authFile = path.join(this.baseDir, 'server', 'auth.ts');
    
    if (!fs.existsSync(authFile)) {
      this.addIssue('HIGH', 'Authentication', 'Authentication file not found', authFile, 0, 
        'Ensure auth.ts exists and implements proper password hashing');
      return;
    }

    const content = fs.readFileSync(authFile, 'utf8');
    
    // Check for scrypt usage (good)
    if (content.includes('scrypt')) {
      this.addIssue('INFO', 'Authentication', 'Using scrypt for password hashing (good)', authFile, 0,
        'Continue using scrypt - it\'s a secure password hashing function');
    }
    
    // Check for deprecated algorithms
    if (content.includes('md5') || content.includes('sha1')) {
      this.addIssue('HIGH', 'Authentication', 'Using deprecated hashing algorithm', authFile, 0,
        'Replace MD5/SHA1 with scrypt, bcrypt, or Argon2');
    }
    
    // Check for salt usage
    if (!content.includes('salt') && !content.includes('randomBytes')) {
      this.addIssue('HIGH', 'Authentication', 'No salt detected in password hashing', authFile, 0,
        'Always use unique salts for password hashing');
    }
    
    // Check for timing safe comparison
    if (content.includes('timingSafeEqual')) {
      this.addIssue('INFO', 'Authentication', 'Using timing-safe comparison (good)', authFile, 0,
        'Continue using timingSafeEqual to prevent timing attacks');
    } else {
      this.addIssue('MEDIUM', 'Authentication', 'Not using timing-safe comparison', authFile, 0,
        'Use crypto.timingSafeEqual() for password verification to prevent timing attacks');
    }
  }

  private async checkTokenGeneration(): Promise<void> {
    // Check for secure token generation
    const files = this.getJSFiles(['server/utils', 'server/middleware']);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for weak token generation
      if (content.includes('Math.random()')) {
        this.addIssue('HIGH', 'Token Generation', 'Using Math.random() for token generation', file, 0,
          'Use crypto.randomBytes() for cryptographically secure random tokens');
      }
      
      // Check for proper token length
      if (content.includes('randomBytes(') && content.includes('randomBytes(8)')) {
        this.addIssue('MEDIUM', 'Token Generation', 'Short token length detected', file, 0,
          'Use at least 32 bytes for secure tokens');
      }
    }
  }

  private async checkAuthMiddleware(): Promise<void> {
    const authMiddleware = path.join(this.baseDir, 'server', 'middleware', 'auth.ts');
    
    if (!fs.existsSync(authMiddleware)) {
      this.addIssue('HIGH', 'Authentication', 'Auth middleware not found', authMiddleware, 0,
        'Implement proper authentication middleware');
      return;
    }

    const content = fs.readFileSync(authMiddleware, 'utf8');
    
    // Check for proper session validation
    if (!content.includes('req.session')) {
      this.addIssue('MEDIUM', 'Authentication', 'No session validation in middleware', authMiddleware, 0,
        'Implement session validation in authentication middleware');
    }
    
    // Check for user existence validation
    if (content.includes('storage.getUser')) {
      this.addIssue('INFO', 'Authentication', 'Validating user existence (good)', authMiddleware, 0,
        'Continue validating user existence on each request');
    }
    
    // Check for proper error handling
    if (!content.includes('catch') || !content.includes('try')) {
      this.addIssue('MEDIUM', 'Authentication', 'Missing error handling in auth middleware', authMiddleware, 0,
        'Add proper try-catch blocks for error handling');
    }
  }

  private async checkAdminAuth(): Promise<void> {
    const adminAuthFile = path.join(this.baseDir, 'server', 'admin-routes.ts');
    
    if (fs.existsSync(adminAuthFile)) {
      const content = fs.readFileSync(adminAuthFile, 'utf8');
      
      // Check for hardcoded admin IDs
      if (content.includes('id === 20') || content.includes('userId === 20')) {
        this.addIssue('MEDIUM', 'Admin Authentication', 'Hardcoded admin ID detected', adminAuthFile, 0,
          'Use role-based authentication instead of hardcoded user IDs');
      }
      
      // Check for admin role validation
      if (content.includes('isAdmin')) {
        this.addIssue('INFO', 'Admin Authentication', 'Admin role validation present (good)', adminAuthFile, 0,
          'Continue using role-based admin validation');
      }
    }
  }

  /**
   * Check session management security
   */
  private async checkSessionManagement(): Promise<void> {
    console.log('🎫 Checking Session Management...');

    const sessionFiles = this.getJSFiles(['server'], ['session', 'auth']);
    
    for (const file of sessionFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check session configuration
      if (content.includes('express-session')) {
        this.checkSessionConfig(content, file);
      }
      
      // Check for session fixation protection
      if (content.includes('req.session.regenerate')) {
        this.addIssue('INFO', 'Session Management', 'Session regeneration implemented (good)', file, 0,
          'Continue using session regeneration for login');
      }
      
      // Check for proper session cleanup
      if (!content.includes('req.logout') && content.includes('login')) {
        this.addIssue('MEDIUM', 'Session Management', 'Missing logout implementation', file, 0,
          'Implement proper session cleanup on logout');
      }
    }
  }

  private checkSessionConfig(content: string, file: string): void {
    // Check for secure cookie settings
    if (!content.includes('secure: true') && !content.includes('secure: isProduction')) {
      this.addIssue('HIGH', 'Session Management', 'Session cookies not marked as secure', file, 0,
        'Set secure: true for session cookies in production');
    }
    
    if (!content.includes('httpOnly: true')) {
      this.addIssue('HIGH', 'Session Management', 'Session cookies not httpOnly', file, 0,
        'Set httpOnly: true to prevent XSS attacks on session cookies');
    }
    
    if (!content.includes('sameSite')) {
      this.addIssue('MEDIUM', 'Session Management', 'SameSite not configured for session cookies', file, 0,
        'Set sameSite to "strict" or "lax" to prevent CSRF attacks');
    }
    
    // Check for session secret
    if (content.includes('secret:') && content.includes('fixer-secret-key')) {
      this.addIssue('HIGH', 'Session Management', 'Default session secret detected', file, 0,
        'Use a strong, unique session secret from environment variables');
    }
  }

  /**
   * Check database security
   */
  private async checkDatabaseSecurity(): Promise<void> {
    console.log('💾 Checking Database Security...');

    // Check for SQL injection protection
    await this.checkSQLInjection();
    
    // Check database connection security
    await this.checkDatabaseConnection();
    
    // Check for sensitive data exposure
    await this.checkSensitiveDataExposure();
  }

  private async checkSQLInjection(): Promise<void> {
    const sqlFiles = this.getJSFiles(['server'], ['storage', 'database', 'query']);
    
    for (const file of sqlFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for raw SQL queries
      if (content.includes('db.execute(') && content.includes('${')) {
        this.addIssue('HIGH', 'Database Security', 'Potential SQL injection vulnerability', file, 0,
          'Use parameterized queries instead of string interpolation');
      }
      
      // Check for Drizzle ORM usage (good)
      if (content.includes('drizzle')) {
        this.addIssue('INFO', 'Database Security', 'Using Drizzle ORM (good for SQL injection prevention)', file, 0,
          'Continue using ORM for database queries');
      }
      
      // Check for prepared statements
      if (content.includes('prepare()')) {
        this.addIssue('INFO', 'Database Security', 'Using prepared statements (good)', file, 0,
          'Continue using prepared statements');
      }
    }
  }

  private async checkDatabaseConnection(): Promise<void> {
    const dbFiles = this.getJSFiles(['server'], ['db', 'database']);
    
    for (const file of dbFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for SSL configuration
      if (content.includes('ssl:') && content.includes('require')) {
        this.addIssue('INFO', 'Database Security', 'SSL connection configured (good)', file, 0,
          'Continue using SSL for database connections');
      }
      
      // Check for connection pooling
      if (content.includes('max:') && content.includes('10')) {
        this.addIssue('INFO', 'Database Security', 'Connection pooling configured (good)', file, 0,
          'Continue using connection pooling');
      }
    }
  }

  private async checkSensitiveDataExposure(): Promise<void> {
    const apiFiles = this.getJSFiles(['server'], ['api', 'routes']);
    
    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for password exposure
      if (content.includes('password') && content.includes('res.json') && !content.includes('...userResponse')) {
        this.addIssue('HIGH', 'Database Security', 'Potential password exposure in API response', file, 0,
          'Never return password fields in API responses');
      }
      
      // Check for sensitive field filtering
      if (content.includes('const { password, ...') || content.includes('delete user.password')) {
        this.addIssue('INFO', 'Database Security', 'Password filtering implemented (good)', file, 0,
          'Continue filtering sensitive fields from API responses');
      }
    }
  }

  /**
   * Check API endpoint security
   */
  private async checkAPIEndpoints(): Promise<void> {
    console.log('🔌 Checking API Endpoint Security...');

    const apiFiles = this.getJSFiles(['server'], ['api', 'routes']);
    
    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for authentication on endpoints
      this.checkEndpointAuth(content, file);
      
      // Check for input validation
      this.checkInputValidationOnEndpoints(content, file);
      
      // Check for proper error handling
      this.checkErrorHandling(content, file);
    }
  }

  private checkEndpointAuth(content: string, file: string): void {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for unprotected endpoints
      if ((line.includes('app.post') || line.includes('app.get') || line.includes('app.put') || line.includes('app.delete')) 
          && !line.includes('login') && !line.includes('register') && !line.includes('health')) {
        
        // Look for authentication middleware in the next few lines
        const nextLines = lines.slice(i, i + 5).join('\n');
        if (!nextLines.includes('isAuthenticated') && !nextLines.includes('requireAuth') && !nextLines.includes('auth')) {
          this.addIssue('HIGH', 'API Security', 'Unprotected API endpoint detected', file, i + 1,
            'Add authentication middleware to all protected endpoints');
        }
      }
    }
  }

  private checkInputValidationOnEndpoints(content: string, file: string): void {
    if (content.includes('req.body') && !content.includes('validate') && !content.includes('zod') && !content.includes('joi')) {
      this.addIssue('MEDIUM', 'API Security', 'Missing input validation', file, 0,
        'Implement input validation for all API endpoints');
    }
    
    if (content.includes('zod') || content.includes('joi')) {
      this.addIssue('INFO', 'API Security', 'Input validation library detected (good)', file, 0,
        'Continue using input validation');
    }
  }

  private checkErrorHandling(content: string, file: string): void {
    if (content.includes('try') && content.includes('catch')) {
      this.addIssue('INFO', 'API Security', 'Error handling implemented (good)', file, 0,
        'Continue using proper error handling');
    } else if (content.includes('app.') && content.includes('async')) {
      this.addIssue('MEDIUM', 'API Security', 'Missing error handling in async endpoints', file, 0,
        'Add try-catch blocks to all async endpoints');
    }
  }

  /**
   * Check file upload security
   */
  private async checkFileUploads(): Promise<void> {
    console.log('📁 Checking File Upload Security...');

    const uploadFiles = this.getJSFiles(['server'], ['upload', 'file', 'avatar']);
    
    for (const file of uploadFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for file type validation
      if (content.includes('multer') || content.includes('upload')) {
        this.checkFileUploadSecurity(content, file);
      }
    }
  }

  private checkFileUploadSecurity(content: string, file: string): void {
    // Check for file size limits
    if (content.includes('limits:') && content.includes('fileSize')) {
      this.addIssue('INFO', 'File Upload Security', 'File size limits configured (good)', file, 0,
        'Continue enforcing file size limits');
    } else {
      this.addIssue('HIGH', 'File Upload Security', 'No file size limits detected', file, 0,
        'Implement file size limits to prevent DoS attacks');
    }
    
    // Check for file type validation
    if (content.includes('mimetype') || content.includes('fileFilter')) {
      this.addIssue('INFO', 'File Upload Security', 'File type validation implemented (good)', file, 0,
        'Continue validating file types');
    } else {
      this.addIssue('HIGH', 'File Upload Security', 'No file type validation detected', file, 0,
        'Implement file type validation to prevent malicious uploads');
    }
    
    // Check for file path validation
    if (!content.includes('path.normalize') && content.includes('filename')) {
      this.addIssue('MEDIUM', 'File Upload Security', 'Missing file path validation', file, 0,
        'Validate and sanitize file paths to prevent directory traversal');
    }
  }

  /**
   * Check environment variables security
   */
  private async checkEnvironmentVariables(): Promise<void> {
    console.log('🌍 Checking Environment Variables...');

    const envFiles = ['.env', '.env.local', '.env.example'];
    
    for (const envFile of envFiles) {
      const filePath = path.join(this.baseDir, envFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.checkEnvSecurity(content, envFile);
      }
    }
  }

  private checkEnvSecurity(content: string, file: string): void {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for weak secrets
      if (line.includes('SECRET=') && (line.includes('secret') || line.includes('password') || line.includes('default'))) {
        this.addIssue('HIGH', 'Environment Security', 'Weak secret detected', file, i + 1,
          'Use strong, randomly generated secrets');
      }
      
      // Check for hardcoded credentials
      if (line.includes('PASSWORD=') && !line.includes('xxx') && !line.includes('your-')) {
        this.addIssue('HIGH', 'Environment Security', 'Hardcoded password in environment file', file, i + 1,
          'Never commit real passwords to version control');
      }
      
      // Check for API keys
      if (line.includes('API_KEY=') && line.includes('sk_') && !line.includes('sk_test_')) {
        this.addIssue('HIGH', 'Environment Security', 'Production API key in environment file', file, i + 1,
          'Never commit production API keys to version control');
      }
    }
  }

  /**
   * Check encryption implementation
   */
  private async checkEncryption(): Promise<void> {
    console.log('🔒 Checking Encryption Implementation...');

    const encryptionFile = path.join(this.baseDir, 'server', 'utils', 'encryption.ts');
    
    if (!fs.existsSync(encryptionFile)) {
      this.addIssue('MEDIUM', 'Encryption', 'No encryption utility found', encryptionFile, 0,
        'Implement encryption for sensitive data storage');
      return;
    }

    const content = fs.readFileSync(encryptionFile, 'utf8');
    
    // Check encryption algorithm
    if (content.includes('aes-256-gcm')) {
      this.addIssue('INFO', 'Encryption', 'Using AES-256-GCM (good)', encryptionFile, 0,
        'Continue using AES-256-GCM for encryption');
    } else if (content.includes('aes-256-cbc')) {
      this.addIssue('MEDIUM', 'Encryption', 'Using AES-256-CBC', encryptionFile, 0,
        'Consider upgrading to AES-256-GCM for authenticated encryption');
    }
    
    // Check for IV usage
    if (content.includes('randomBytes') && content.includes('iv')) {
      this.addIssue('INFO', 'Encryption', 'Using random IVs (good)', encryptionFile, 0,
        'Continue using random IVs for each encryption');
    }
    
    // Check for key management
    if (content.includes('ENCRYPTION_KEY') && content.includes('env')) {
      this.addIssue('INFO', 'Encryption', 'Key from environment variables (good)', encryptionFile, 0,
        'Continue storing encryption keys in environment variables');
    }
  }

  /**
   * Check input validation
   */
  private async checkInputValidation(): Promise<void> {
    console.log('✅ Checking Input Validation...');

    const files = this.getJSFiles(['server', 'client/src']);
    let hasValidation = false;
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('zod') || content.includes('joi') || content.includes('validator')) {
        hasValidation = true;
        this.addIssue('INFO', 'Input Validation', `Validation library found in ${file}`, file, 0,
          'Continue using input validation');
      }
      
      // Check for dangerous functions
      if (content.includes('eval(') || content.includes('Function(')) {
        this.addIssue('HIGH', 'Input Validation', 'Dangerous function usage detected', file, 0,
          'Never use eval() or Function() with user input');
      }
    }
    
    if (!hasValidation) {
      this.addIssue('HIGH', 'Input Validation', 'No input validation library detected', '', 0,
        'Implement comprehensive input validation using Zod or Joi');
    }
  }

  /**
   * Check rate limiting implementation
   */
  private async checkRateLimiting(): Promise<void> {
    console.log('⏱️ Checking Rate Limiting...');

    const files = this.getJSFiles(['server']);
    let hasRateLimit = false;
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('express-rate-limit') || content.includes('rateLimit')) {
        hasRateLimit = true;
        this.addIssue('INFO', 'Rate Limiting', 'Rate limiting implemented (good)', file, 0,
          'Continue using rate limiting');
      }
    }
    
    if (!hasRateLimit) {
      this.addIssue('MEDIUM', 'Rate Limiting', 'No rate limiting detected', '', 0,
        'Implement rate limiting to prevent abuse');
    }
  }

  /**
   * Check CORS configuration
   */
  private async checkCORSConfiguration(): Promise<void> {
    console.log('🌐 Checking CORS Configuration...');

    const files = this.getJSFiles(['server']);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('cors')) {
        if (content.includes('origin: "*"') || content.includes("origin: '*'")) {
          this.addIssue('HIGH', 'CORS Security', 'Wildcard CORS origin detected', file, 0,
            'Restrict CORS origins to specific domains');
        } else if (content.includes('origin:')) {
          this.addIssue('INFO', 'CORS Security', 'CORS origin configured (good)', file, 0,
            'Continue using specific CORS origins');
        }
      }
    }
  }

  /**
   * Helper methods
   */
  private getJSFiles(directories: string[], filters: string[] = []): string[] {
    const files: string[] = [];
    
    for (const dir of directories) {
      const fullDir = path.join(this.baseDir, dir);
      if (fs.existsSync(fullDir)) {
        const dirFiles = this.walkDirectory(fullDir, ['.ts', '.js']);
        
        if (filters.length > 0) {
          const filtered = dirFiles.filter(file => 
            filters.some(filter => file.toLowerCase().includes(filter.toLowerCase()))
          );
          files.push(...filtered);
        } else {
          files.push(...dirFiles);
        }
      }
    }
    
    return files;
  }

  private walkDirectory(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.walkDirectory(fullPath, extensions));
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  private addIssue(severity: SecurityIssue['severity'], category: string, description: string, file: string, line: number, recommendation: string): void {
    this.issues.push({
      severity,
      category,
      description,
      file: file ? path.relative(this.baseDir, file) : undefined,
      line: line || undefined,
      recommendation
    });
  }

  private generateReport(): SecurityReport {
    const summary = {
      high: this.issues.filter(i => i.severity === 'HIGH').length,
      medium: this.issues.filter(i => i.severity === 'MEDIUM').length,
      low: this.issues.filter(i => i.severity === 'LOW').length,
      info: this.issues.filter(i => i.severity === 'INFO').length
    };

    // Calculate security score (0-100)
    const totalIssues = summary.high + summary.medium + summary.low;
    const weightedScore = (summary.high * 3) + (summary.medium * 2) + (summary.low * 1);
    const overallScore = Math.max(0, 100 - (weightedScore * 2));

    return {
      issues: this.issues,
      summary,
      overallScore
    };
  }

  /**
   * Print formatted report
   */
  printReport(report: SecurityReport): void {
    console.log('\n🔒 SECURITY AUDIT REPORT');
    console.log('=======================\n');

    console.log(`Overall Security Score: ${report.overallScore}/100`);
    console.log(`Total Issues Found: ${report.issues.length}`);
    console.log(`  High Severity: ${report.summary.high}`);
    console.log(`  Medium Severity: ${report.summary.medium}`);
    console.log(`  Low Severity: ${report.summary.low}`);
    console.log(`  Informational: ${report.summary.info}\n`);

    // Group issues by severity
    const severityOrder: SecurityIssue['severity'][] = ['HIGH', 'MEDIUM', 'LOW', 'INFO'];
    
    for (const severity of severityOrder) {
      const severityIssues = report.issues.filter(i => i.severity === severity);
      if (severityIssues.length === 0) continue;

      console.log(`\n${this.getSeverityIcon(severity)} ${severity} SEVERITY ISSUES (${severityIssues.length})`);
      console.log('='.repeat(50));

      for (const issue of severityIssues) {
        console.log(`\n📁 Category: ${issue.category}`);
        console.log(`📝 Description: ${issue.description}`);
        if (issue.file) {
          console.log(`📄 File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
        console.log(`💡 Recommendation: ${issue.recommendation}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Security audit completed.');
    
    if (report.summary.high > 0) {
      console.log('\n⚠️  HIGH SEVERITY ISSUES FOUND! Please address these immediately.');
    } else if (report.summary.medium > 0) {
      console.log('\n⚠️  Medium severity issues found. Please review and address.');
    } else {
      console.log('\n✅ No high or medium severity issues found!');
    }
  }

  private getSeverityIcon(severity: SecurityIssue['severity']): string {
    switch (severity) {
      case 'HIGH': return '🚨';
      case 'MEDIUM': return '⚠️';
      case 'LOW': return '⚡';
      case 'INFO': return 'ℹ️';
      default: return '❓';
    }
  }
}

// Main execution
async function main() {
  try {
    const auditor = new SecurityAuditor();
    const report = await auditor.runAudit();
    auditor.printReport(report);
    
    // Exit with error code if high severity issues found
    process.exit(report.summary.high > 0 ? 1 : 0);
  } catch (error) {
    console.error('Security audit failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SecurityAuditor, SecurityReport, SecurityIssue }; 