/**
 * Content Moderation Utility
 * Prevents inappropriate usernames, names, and content
 */

// Comprehensive list of inappropriate terms (sexual, offensive, etc.)
const INAPPROPRIATE_TERMS = [
  // Sexual terms
  'sex', 'sexy', 'porn', 'xxx', 'adult', 'nude', 'naked', 'strip', 'escort', 'hooker', 'whore', 'slut', 'bitch',
  'cock', 'dick', 'penis', 'vagina', 'pussy', 'tits', 'boobs', 'ass', 'butt', 'anal', 'oral', 'blow', 'suck',
  'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'damn', 'hell', 'bitch', 'bastard', 'cunt', 'piss',
  'horny', 'kinky', 'fetish', 'bdsm', 'dildo', 'vibrator', 'masturbate', 'orgasm', 'climax', 'cum', 'jizz',
  
  // Hate speech and offensive terms
  'nazi', 'hitler', 'terrorist', 'bomb', 'kill', 'murder', 'rape', 'molest', 'abuse', 'violence',
  'racist', 'nigger', 'faggot', 'retard', 'spic', 'chink', 'kike', 'wetback', 'towelhead',
  
  // Drug-related
  'cocaine', 'heroin', 'meth', 'crack', 'weed', 'marijuana', 'dealer', 'drugs', 'high', 'stoned',
  
  // Scam/fraud related
  'scam', 'fraud', 'fake', 'phishing', 'spam', 'bot', 'hack', 'steal', 'cheat', 'illegal',
  
  // Professional inappropriate
  'admin', 'moderator', 'support', 'official', 'staff', 'employee', 'manager', 'ceo', 'owner',
  'fixer', 'fixerapp', 'system', 'root', 'null', 'undefined', 'test', 'demo', 'sample',
  
  // Common variations and leetspeak
  'p0rn', 'pr0n', 's3x', 'f*ck', 'f**k', 'sh*t', 'b*tch', 'a$$', 'h3ll', 'd*mn',
  '69', '420', '666', 'xxx', 'xnxx', 'pornhub', 'onlyfans', 'chaturbate'
];

// Suspicious patterns that might indicate inappropriate content
const SUSPICIOUS_PATTERNS = [
  /\b(sex|porn|xxx|adult|nude|escort)\w*/i,
  /\b\w*(sex|porn|xxx|nude)\w*\b/i,
  /\b(fuck|shit|damn|hell|bitch|ass|cock|dick|pussy|tits)\w*/i,
  /\w*(69|420|xxx)\w*/i,
  /\b(admin|mod|staff|support|official|system|root)\d*\b/i,
  /\b(test|demo|sample|fake|bot)\d*\b/i,
  /^[^a-zA-Z]*$/, // Only numbers/symbols
  /(.)\1{4,}/, // Repeated characters (aaaaa)
  /\d{8,}/, // Long number sequences
  /[!@#$%^&*()]{3,}/, // Multiple special characters
];

// Common inappropriate username patterns
const INAPPROPRIATE_USERNAME_PATTERNS = [
  /^(sex|porn|xxx|adult|nude|fuck|shit|damn|hell|bitch|ass|cock|dick|pussy|tits)/i,
  /(sex|porn|xxx|adult|nude|fuck|shit|damn|hell|bitch|ass|cock|dick|pussy|tits)$/i,
  /\b(admin|moderator|support|staff|official|system|root|null|undefined)\b/i,
  /^(test|demo|sample|fake|bot)\d*$/i,
];

// Professional terms that shouldn't be in usernames
const RESERVED_TERMS = [
  'admin', 'administrator', 'moderator', 'mod', 'support', 'help', 'staff', 'employee',
  'manager', 'supervisor', 'owner', 'ceo', 'president', 'director', 'official',
  'fixer', 'fixerapp', 'system', 'root', 'api', 'www', 'mail', 'email', 'service',
  'null', 'undefined', 'test', 'demo', 'sample', 'example', 'placeholder'
];

export interface ModerationResult {
  isValid: boolean;
  reason?: string;
  flaggedTerms?: string[];
  severity: 'low' | 'medium' | 'high';
}

/**
 * Check if a username is appropriate
 */
export function validateUsername(username: string): ModerationResult {
  const lowerUsername = username.toLowerCase().trim();
  
  // Check length
  if (lowerUsername.length < 3) {
    return {
      isValid: false,
      reason: 'Username must be at least 3 characters long',
      severity: 'low'
    };
  }
  
  if (lowerUsername.length > 30) {
    return {
      isValid: false,
      reason: 'Username must be less than 30 characters',
      severity: 'low'
    };
  }
  
  // Check for inappropriate terms
  const flaggedTerms: string[] = [];
  
  for (const term of INAPPROPRIATE_TERMS) {
    if (lowerUsername.includes(term.toLowerCase())) {
      flaggedTerms.push(term);
    }
  }
  
  if (flaggedTerms.length > 0) {
    return {
      isValid: false,
      reason: 'Username contains inappropriate content',
      flaggedTerms,
      severity: 'high'
    };
  }
  
  // Check for reserved terms
  for (const term of RESERVED_TERMS) {
    if (lowerUsername === term || lowerUsername.includes(term)) {
      return {
        isValid: false,
        reason: 'Username contains reserved terms',
        flaggedTerms: [term],
        severity: 'medium'
      };
    }
  }
  
  // Check suspicious patterns
  for (const pattern of INAPPROPRIATE_USERNAME_PATTERNS) {
    if (pattern.test(lowerUsername)) {
      return {
        isValid: false,
        reason: 'Username format is not allowed',
        severity: 'high'
      };
    }
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerUsername)) {
      return {
        isValid: false,
        reason: 'Username contains suspicious patterns',
        severity: 'medium'
      };
    }
  }
  
  // Check for valid characters only
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      isValid: false,
      reason: 'Username can only contain letters, numbers, underscores, and hyphens',
      severity: 'low'
    };
  }
  
  return {
    isValid: true,
    severity: 'low'
  };
}

/**
 * Check if a full name is appropriate
 */
export function validateFullName(fullName: string): ModerationResult {
  const lowerName = fullName.toLowerCase().trim();
  
  // Check length
  if (lowerName.length < 2) {
    return {
      isValid: false,
      reason: 'Full name must be at least 2 characters long',
      severity: 'low'
    };
  }
  
  if (lowerName.length > 100) {
    return {
      isValid: false,
      reason: 'Full name must be less than 100 characters',
      severity: 'low'
    };
  }
  
  // Check for inappropriate terms
  const flaggedTerms: string[] = [];
  
  for (const term of INAPPROPRIATE_TERMS) {
    if (lowerName.includes(term.toLowerCase())) {
      flaggedTerms.push(term);
    }
  }
  
  if (flaggedTerms.length > 0) {
    return {
      isValid: false,
      reason: 'Full name contains inappropriate content',
      flaggedTerms,
      severity: 'high'
    };
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerName)) {
      return {
        isValid: false,
        reason: 'Full name contains suspicious patterns',
        severity: 'medium'
      };
    }
  }
  
  // Check for valid name characters (letters, spaces, apostrophes, hyphens)
  if (!/^[a-zA-Z\s'-]+$/.test(fullName)) {
    return {
      isValid: false,
      reason: 'Full name can only contain letters, spaces, apostrophes, and hyphens',
      severity: 'low'
    };
  }
  
  // Check for realistic name patterns
  const words = fullName.trim().split(/\s+/);
  if (words.length > 5) {
    return {
      isValid: false,
      reason: 'Full name cannot have more than 5 words',
      severity: 'medium'
    };
  }
  
  // Check for repeated characters (like "aaaa" or "1111")
  if (/(.)\1{3,}/.test(fullName)) {
    return {
      isValid: false,
      reason: 'Full name cannot contain repeated characters',
      severity: 'medium'
    };
  }
  
  return {
    isValid: true,
    severity: 'low'
  };
}

/**
 * Log moderation events for monitoring
 */
export function logModerationEvent(
  type: 'username' | 'fullName' | 'content',
  input: string,
  result: ModerationResult,
  userId?: number,
  ip?: string
) {
  const logData = {
    timestamp: new Date().toISOString(),
    type,
    input: input.substring(0, 50), // Truncate for privacy
    isValid: result.isValid,
    reason: result.reason,
    flaggedTerms: result.flaggedTerms,
    severity: result.severity,
    userId,
    ip: ip ? ip.substring(0, 10) + '...' : undefined // Partial IP for privacy
  };
  
  console.log('[CONTENT_MODERATION]', JSON.stringify(logData));
  
  // In production, you might want to send this to a monitoring service
  // or store in a dedicated moderation log table
}

/**
 * Suggest alternative usernames if the original is inappropriate
 */
export function suggestAlternativeUsernames(originalUsername: string): string[] {
  const suggestions: string[] = [];
  const cleanBase = originalUsername.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  
  if (cleanBase.length >= 3) {
    suggestions.push(
      `${cleanBase}${Math.floor(Math.random() * 1000)}`,
      `user_${cleanBase}`,
      `${cleanBase}_user`,
      `${cleanBase}${new Date().getFullYear()}`,
      `${cleanBase}_${Math.floor(Math.random() * 100)}`
    );
  } else {
    // If the base is too short, generate generic suggestions
    suggestions.push(
      `user${Math.floor(Math.random() * 10000)}`,
      `worker${Math.floor(Math.random() * 1000)}`,
      `member${Math.floor(Math.random() * 1000)}`,
      `user_${new Date().getFullYear()}`,
      `newuser${Math.floor(Math.random() * 100)}`
    );
  }
  
  return suggestions.slice(0, 3); // Return top 3 suggestions
}
