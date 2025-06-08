// Job content validation utility
// Prevents inappropriate, illegal, or offensive job postings while allowing legitimate jobs

const INAPPROPRIATE_JOB_KEYWORDS = [
  // Sexual content and adult services
  'sex', 'sexual', 'porn', 'pornography', 'nude', 'naked', 'strip', 'stripper', 'escort', 'prostitution',
  'masturbation', 'orgasm', 'erotic', 'fetish', 'bdsm', 'adult entertainment', 'webcam', 'cam girl',
  'sugar daddy', 'sugar baby', 'hookup', 'one night stand', 'casual sex', 'friends with benefits',
  'adult massage', 'happy ending', 'sensual massage', 'intimate services', 'companionship services',
  
  // Violence and illegal activities
  'murder', 'kill', 'killing', 'assassination', 'assassin', 'hitman', 'torture', 'abuse', 'violence',
  'assault', 'rape', 'molest', 'kidnap', 'kidnapping', 'terrorism', 'terrorist', 'bomb making',
  'explosive', 'weapon sales', 'gun running', 'arms dealing', 'knife fighting', 'poison making',
  'human trafficking', 'slavery', 'forced labor', 'child labor', 'sweatshop',
  
  // Drug and substance related
  'drug dealing', 'drug sales', 'drug distribution', 'drug manufacturing', 'drug trafficking',
  'cocaine', 'heroin', 'meth', 'methamphetamine', 'crack', 'ecstasy', 'lsd', 'marijuana dealing',
  'weed dealer', 'drug runner', 'drug mule', 'narcotics', 'illegal substances', 'drug lab',
  'grow operation', 'cannabis cultivation', 'drug smuggling', 'prescription fraud',
  
  // Financial crimes and fraud
  'money laundering', 'fraud', 'scam', 'ponzi scheme', 'pyramid scheme', 'identity theft',
  'credit card fraud', 'bank fraud', 'insurance fraud', 'tax evasion', 'embezzlement',
  'counterfeiting', 'forgery', 'fake documents', 'stolen goods', 'fence stolen items',
  'check fraud', 'wire fraud', 'phishing', 'social engineering', 'advance fee fraud',
  
  // Hacking and cybercrime
  'hacking', 'hack into', 'ddos attack', 'malware', 'virus creation', 'ransomware',
  'data breach', 'password cracking', 'account takeover', 'botnet', 'dark web',
  'illegal downloads', 'piracy', 'copyright infringement', 'software cracking',
  
  // Theft and burglary
  'theft', 'stealing', 'robbery', 'burglary', 'shoplifting', 'pickpocketing', 'breaking and entering',
  'car theft', 'auto theft', 'bike theft', 'package theft', 'mail theft', 'cargo theft',
  
  // Other illegal activities
  'extortion', 'blackmail', 'bribery', 'corruption', 'arson', 'vandalism', 'graffiti',
  'illegal gambling', 'underground fighting', 'dog fighting', 'cock fighting', 'animal abuse',
  'poaching', 'illegal hunting', 'wildlife trafficking', 'organ trafficking',
  
  // Hate speech and discrimination
  'nazi', 'hitler', 'genocide', 'ethnic cleansing', 'white supremacy', 'kkk', 'hate group',
  'racial discrimination', 'religious discrimination', 'harassment', 'stalking', 'doxxing',
  'revenge porn', 'non-consensual', 'blackmail photos', 'sextortion',
  
  // Harmful activities
  'suicide', 'self harm', 'cutting', 'eating disorder', 'anorexia', 'bulimia', 'child abuse',
  'elder abuse', 'domestic violence', 'animal cruelty', 'bestiality', 'necrophilia',
  'cannibalism', 'cult recruitment', 'extremist recruitment', 'radicalization',
  
  // Misleading or predatory
  'get rich quick', 'make money fast', 'work from home scam', 'mlm', 'multi level marketing',
  'pyramid selling', 'chain letter', 'advance payment', 'upfront fee', 'processing fee',
  'training fee required', 'starter kit fee', 'background check fee', 'equipment fee',
];

const SUSPICIOUS_JOB_PATTERNS = [
  // Patterns that might indicate inappropriate content
  /\b(kill|murder|harm|hurt|abuse|torture)\s+(people|person|someone|anyone|children|kids)\b/i,
  /\b(sell|selling|deal|dealing|distribute|traffic|smuggle)\s+(drugs|cocaine|heroin|meth|weapons|guns|stolen)\b/i,
  /\b(hack|hacking|break into|steal|fraud|scam)\s+(accounts|systems|data|money|information|passwords)\b/i,
  /\b(sexual|erotic|adult|intimate)\s+(services|entertainment|massage|companionship|content)\b/i,
  /\b(illegal|unlawful|criminal|underground)\s+(activities|services|operations|business|work)\b/i,
  /\b(no experience|easy money|work from home)\s+(guaranteed|fast cash|quick money|instant pay)\b/i,
  /\b(pay upfront|advance payment|processing fee|training fee)\s+(required|needed|necessary)\b/i,
  /\b(child|minor|underage)\s+(model|actor|performer|entertainment|services)\b/i,
  /\b(cash only|under the table|off the books|no taxes|tax free)\b/i,
  /\b(meet in private|secluded location|hotel room|private residence)\s+(only|required|preferred)\b/i,
];

const LEGITIMATE_EXCEPTIONS = [
  // Words that might be flagged but are legitimate in certain contexts
  'security', 'protection', 'safety', 'guard', 'bouncer', 'bodyguard',
  'pest control', 'exterminator', 'animal control', 'wildlife management',
  'pharmacy', 'pharmaceutical', 'medical', 'healthcare', 'nursing',
  'law enforcement', 'police', 'detective', 'investigator', 'legal',
  'military', 'defense', 'veteran', 'armed forces', 'national guard',
  'driving', 'delivery', 'transportation', 'logistics', 'shipping',
];

/**
 * Validates if a job posting is appropriate and legitimate
 * @param title - The job title
 * @param description - The job description
 * @param category - The job category
 * @returns Object with isValid boolean and reason if invalid
 */
export function validateJobPosting(
  title: string, 
  description: string, 
  category?: string
): { isValid: boolean; reason?: string; flaggedContent?: string[] } {
  const flaggedContent: string[] = [];
  
  if (!title || typeof title !== 'string') {
    return { isValid: false, reason: 'Job title must be a non-empty string' };
  }
  
  if (!description || typeof description !== 'string') {
    return { isValid: false, reason: 'Job description must be a non-empty string' };
  }
  
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedDescription = description.toLowerCase().trim();
  const fullContent = `${normalizedTitle} ${normalizedDescription}`;
  
  // Check minimum lengths
  if (normalizedTitle.length < 3) {
    return { isValid: false, reason: 'Job title must be at least 3 characters long' };
  }
  
  if (normalizedDescription.length < 10) {
    return { isValid: false, reason: 'Job description must be at least 10 characters long' };
  }
  
  // Check maximum lengths
  if (normalizedTitle.length > 200) {
    return { isValid: false, reason: 'Job title must be less than 200 characters long' };
  }
  
  if (normalizedDescription.length > 5000) {
    return { isValid: false, reason: 'Job description must be less than 5000 characters long' };
  }
  
  // Check for inappropriate keywords
  for (const keyword of INAPPROPRIATE_JOB_KEYWORDS) {
    if (fullContent.includes(keyword.toLowerCase())) {
      // Check if it's a legitimate exception in proper context
      const isLegitimate = LEGITIMATE_EXCEPTIONS.some(exception => 
        fullContent.includes(exception.toLowerCase()) && 
        isLegitimateContext(fullContent, keyword, exception)
      );
      
      if (!isLegitimate) {
        flaggedContent.push(keyword);
      }
    }
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_JOB_PATTERNS) {
    if (pattern.test(fullContent)) {
      const match = fullContent.match(pattern);
      if (match) {
        flaggedContent.push(match[0]);
      }
    }
  }
  
  if (flaggedContent.length > 0) {
    return { 
      isValid: false, 
      reason: 'Job posting contains inappropriate or potentially illegal content',
      flaggedContent 
    };
  }
  
  // Check for excessive special characters (likely spam)
  const specialCharCount = (fullContent.match(/[^a-z0-9\s\-.,!?]/g) || []).length;
  if (specialCharCount > fullContent.length * 0.1) {
    return { isValid: false, reason: 'Job posting contains too many special characters' };
  }
  
  // Check for excessive repetition (likely spam)
  if (/(.{3,})\1{3,}/.test(fullContent)) {
    return { isValid: false, reason: 'Job posting contains excessive repetition' };
  }
  
  // Check for all caps (likely spam/inappropriate)
  const capsCount = (title.match(/[A-Z]/g) || []).length;
  if (title.length > 10 && capsCount > title.length * 0.7) {
    return { isValid: false, reason: 'Job title should not be mostly in capital letters' };
  }
  
  // Check for suspicious payment terms
  if (/\b(pay.*upfront|advance.*payment|processing.*fee|training.*fee.*required)\b/i.test(fullContent)) {
    return { isValid: false, reason: 'Job posting contains suspicious payment requirements' };
  }
  
  // Check for unrealistic salary promises
  if (/\b(earn.*\$\d{4,}.*week|make.*\$\d{4,}.*day|guaranteed.*\$\d{4,})\b/i.test(fullContent)) {
    return { isValid: false, reason: 'Job posting contains unrealistic salary promises' };
  }
  
  return { isValid: true };
}

/**
 * Checks if a keyword appears in a legitimate context
 */
function isLegitimateContext(content: string, keyword: string, exception: string): boolean {
  const keywordIndex = content.indexOf(keyword.toLowerCase());
  const exceptionIndex = content.indexOf(exception.toLowerCase());
  
  // If the exception appears near the keyword, it might be legitimate
  if (Math.abs(keywordIndex - exceptionIndex) < 50) {
    return true;
  }
  
  return false;
}

/**
 * Sanitizes job content by removing extra whitespace and normalizing formatting
 */
export function sanitizeJobContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  return content
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
    .replace(/[^\w\s\-.,!?()[\]{}:;"'@#$%&*+=<>/\\|`~]/g, '') // Remove unusual special characters
    .substring(0, 5000); // Enforce maximum length
}

/**
 * Validates job payment amount for reasonableness
 */
export function validateJobPayment(
  paymentAmount: number, 
  paymentType: 'fixed' | 'hourly',
  estimatedHours?: number
): { isValid: boolean; reason?: string } {
  if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
    return { isValid: false, reason: 'Payment amount must be a positive number' };
  }
  
  // Check minimum wage compliance (using $7.25 federal minimum)
  const minimumWage = 7.25;
  
  if (paymentType === 'hourly') {
    if (paymentAmount < minimumWage) {
      return { isValid: false, reason: `Hourly rate must be at least $${minimumWage} (federal minimum wage)` };
    }
    
    if (paymentAmount > 500) {
      return { isValid: false, reason: 'Hourly rate seems unreasonably high (over $500/hour)' };
    }
  } else if (paymentType === 'fixed') {
    if (paymentAmount < 5) {
      return { isValid: false, reason: 'Fixed payment must be at least $5' };
    }
    
    if (paymentAmount > 50000) {
      return { isValid: false, reason: 'Fixed payment seems unreasonably high (over $50,000)' };
    }
    
    // Check if fixed payment with estimated hours results in below minimum wage
    if (estimatedHours && estimatedHours > 0) {
      const effectiveHourlyRate = paymentAmount / estimatedHours;
      if (effectiveHourlyRate < minimumWage) {
        return { 
          isValid: false, 
          reason: `Payment amount results in below minimum wage ($${effectiveHourlyRate.toFixed(2)}/hour)` 
        };
      }
    }
  }
  
  return { isValid: true };
}

/**
 * Validates required skills for a job posting
 */
export function validateJobSkills(skills: string[]): { isValid: boolean; reason?: string; invalidSkills?: string[] } {
  if (!Array.isArray(skills)) {
    return { isValid: false, reason: 'Skills must be an array' };
  }
  
  if (skills.length > 20) {
    return { isValid: false, reason: 'Job cannot require more than 20 skills' };
  }
  
  const invalidSkills: string[] = [];
  
  for (const skill of skills) {
    if (!skill || typeof skill !== 'string') {
      invalidSkills.push(skill);
      continue;
    }
    
    const normalizedSkill = skill.toLowerCase().trim();
    
    // Check for inappropriate skill requirements
    for (const keyword of INAPPROPRIATE_JOB_KEYWORDS) {
      if (normalizedSkill.includes(keyword.toLowerCase())) {
        invalidSkills.push(skill);
        break;
      }
    }
    
    // Check skill length
    if (normalizedSkill.length < 2 || normalizedSkill.length > 50) {
      invalidSkills.push(skill);
    }
  }
  
  if (invalidSkills.length > 0) {
    return { 
      isValid: false, 
      reason: 'Some required skills are inappropriate or invalid',
      invalidSkills 
    };
  }
  
  return { isValid: true };
} 