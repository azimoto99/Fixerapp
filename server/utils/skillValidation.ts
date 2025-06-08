// Skill content validation utility
// Prevents inappropriate, illegal, or offensive skills while allowing legitimate custom skills

const INAPPROPRIATE_KEYWORDS = [
  // Sexual content
  'sex', 'sexual', 'porn', 'pornography', 'nude', 'naked', 'strip', 'escort', 'prostitution',
  'masturbation', 'orgasm', 'erotic', 'fetish', 'bdsm', 'anal', 'oral', 'vaginal', 'penis',
  'vagina', 'breast', 'nipple', 'ass', 'pussy', 'dick', 'cock', 'cum', 'cumming', 'fucking',
  'blowjob', 'handjob', 'rimjob', 'threesome', 'orgy', 'gangbang', 'bukkake', 'creampie',
  
  // Violence and illegal activities
  'murder', 'kill', 'killing', 'assassination', 'torture', 'abuse', 'violence', 'assault',
  'rape', 'molest', 'kidnap', 'kidnapping', 'terrorism', 'bomb', 'explosive', 'weapon',
  'gun', 'knife', 'poison', 'drug dealing', 'trafficking', 'smuggling', 'fraud', 'scam',
  'theft', 'stealing', 'robbery', 'burglary', 'hacking', 'identity theft', 'money laundering',
  'extortion', 'blackmail', 'bribery', 'corruption', 'arson', 'vandalism',
  
  // Drugs and substances
  'cocaine', 'heroin', 'meth', 'methamphetamine', 'crack', 'ecstasy', 'lsd', 'marijuana dealing',
  'drug manufacturing', 'drug distribution', 'drug sales', 'illegal drugs', 'narcotics',
  
  // Hate speech and discrimination
  'nazi', 'hitler', 'genocide', 'ethnic cleansing', 'white supremacy', 'kkk', 'racial slurs',
  'hate speech', 'discrimination', 'harassment', 'stalking', 'doxxing',
  
  // Other inappropriate content
  'suicide', 'self harm', 'cutting', 'anorexia', 'bulimia', 'child abuse', 'pedophile',
  'bestiality', 'necrophilia', 'incest', 'cannibalism', 'human trafficking', 'slavery',
  
  // Common inappropriate phrases
  'eating ass', 'licking ass', 'sucking dick', 'fucking bitches', 'killing people',
  'selling drugs', 'making bombs', 'hacking accounts', 'stealing money', 'fraud schemes'
];

const SUSPICIOUS_PATTERNS = [
  // Patterns that might indicate inappropriate content
  /\b(kill|murder|rape|abuse|torture|molest|kidnap)\s+(people|children|women|men)\b/i,
  /\b(sell|selling|deal|dealing|traffic|trafficking)\s+(drugs|cocaine|heroin|meth|weapons|guns)\b/i,
  /\b(hack|hacking|steal|stealing|fraud|scam)\s+(accounts|money|data|information)\b/i,
  /\b(child|kid|minor)\s+(abuse|exploitation|trafficking|pornography)\b/i,
  /\b(sexual|erotic|porn)\s+(services|content|material)\b/i,
  /\b(illegal|unlawful|criminal)\s+(activities|services|operations)\b/i,
];

/**
 * Validates if a skill is appropriate and legitimate
 * @param skill - The skill string to validate
 * @returns Object with isValid boolean and reason if invalid
 */
export function validateSkill(skill: string): { isValid: boolean; reason?: string } {
  if (!skill || typeof skill !== 'string') {
    return { isValid: false, reason: 'Skill must be a non-empty string' };
  }

  const normalizedSkill = skill.toLowerCase().trim();
  
  // Check minimum length
  if (normalizedSkill.length < 2) {
    return { isValid: false, reason: 'Skill must be at least 2 characters long' };
  }
  
  // Check maximum length
  if (normalizedSkill.length > 50) {
    return { isValid: false, reason: 'Skill must be less than 50 characters long' };
  }
  
  // Check for inappropriate keywords
  for (const keyword of INAPPROPRIATE_KEYWORDS) {
    if (normalizedSkill.includes(keyword.toLowerCase())) {
      return { isValid: false, reason: 'Skill contains inappropriate content' };
    }
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(normalizedSkill)) {
      return { isValid: false, reason: 'Skill contains inappropriate content' };
    }
  }
  
  // Check for excessive special characters or numbers (likely spam/inappropriate)
  const specialCharCount = (normalizedSkill.match(/[^a-z0-9\s\-]/g) || []).length;
  const numberCount = (normalizedSkill.match(/[0-9]/g) || []).length;
  
  if (specialCharCount > 3) {
    return { isValid: false, reason: 'Skill contains too many special characters' };
  }
  
  if (numberCount > normalizedSkill.length / 2) {
    return { isValid: false, reason: 'Skill contains too many numbers' };
  }
  
  // Check for repeated characters (likely spam)
  if (/(.)\1{4,}/.test(normalizedSkill)) {
    return { isValid: false, reason: 'Skill contains excessive repeated characters' };
  }
  
  // Check for all caps (likely spam/inappropriate)
  if (skill.length > 5 && skill === skill.toUpperCase() && /[A-Z]/.test(skill)) {
    return { isValid: false, reason: 'Skill should not be in all caps' };
  }
  
  return { isValid: true };
}

/**
 * Validates an array of skills
 * @param skills - Array of skill strings to validate
 * @returns Object with isValid boolean, invalidSkills array, and reasons
 */
export function validateSkills(skills: string[]): { 
  isValid: boolean; 
  invalidSkills: string[]; 
  reasons: string[] 
} {
  const invalidSkills: string[] = [];
  const reasons: string[] = [];
  
  for (const skill of skills) {
    const validation = validateSkill(skill);
    if (!validation.isValid) {
      invalidSkills.push(skill);
      reasons.push(validation.reason || 'Invalid skill');
    }
  }
  
  return {
    isValid: invalidSkills.length === 0,
    invalidSkills,
    reasons
  };
}

/**
 * Sanitizes a skill by removing extra whitespace and normalizing case
 * @param skill - The skill string to sanitize
 * @returns Sanitized skill string
 */
export function sanitizeSkill(skill: string): string {
  if (!skill || typeof skill !== 'string') {
    return '';
  }
  
  return skill
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
} 