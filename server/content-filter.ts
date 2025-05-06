/**
 * Content filter for blocking illegal, inappropriate, or spam job postings
 */

export type ContentFilterResult = {
  isApproved: boolean;
  reason?: string;
};

// Regular expressions for detecting problematic content
const PROHIBITED_CONTENT = {
  spam: [
    /\b(earn|make)(\s+)?\$\d+(\s+)?(per|a|each)(\s+)?(day|week|month|hour)\b/i,
    /\b(business|money making)(\s+)?opportunity\b/i,
    /\bget(\s+)?rich(\s+)?quick\b/i,
    /\bwork(\s+)?from(\s+)?home\b/i,
    /\beasy(\s+)?money\b/i,
    /\bno(\s+)?experience(\s+)?needed\b/i,
    /\bguaranteed(\s+)?income\b/i,
    /\b100%(\s+)?free\b/i,
    /\blimited(\s+)?time(\s+)?offer\b/i,
  ],
  illegal: [
    /\b(illegal|illicit)\b/i,
    /\bdrug(\s+)?(deal|sell|deliver)/i,
    /\bweed(\s+)?(distribut|sell|deliver)/i,
    /\b(cocaine|heroin|meth|ecstasy)\b/i,
    /\bcounterfeit\b/i,
    /\bfake(\s+)?id\b/i,
    /\bstolen(\s+)?(goods|items|merchandise)\b/i,
    /\bhack(ing)?\b/i,
    /\b(child|kiddie)(\s+)?(porn|pornography)\b/i,
    /\bescort\b/i,
    /\bprostitut/i
  ],
  scam: [
    /\badvance(\s+)?fee\b/i,
    /\binvestment(\s+)?scheme\b/i,
    /\bpyramid(\s+)?scheme\b/i,
    /\bponzi\b/i,
    /\bmlm\b/i,
    /\bmulti(\s+)?level(\s+)?marketing\b/i,
    /\bno(\s+)?risk\b/i,
    /\bhundred(\s+)?percent(\s+)?guaranteed\b/i,
  ],
  inappropriate: [
    /\b(sex|sexual|nude|naked)\b/i,
    /\badult(\s+)?content\b/i,
    /\bporn\b/i,
    /\bxxx\b/i,
  ]
};

// Keywords that might indicate a suspicious job but need context
const SUSPICIOUS_KEYWORDS = [
  'cash only', 
  'untraceable', 
  'no questions asked', 
  'under the table', 
  'not legal', 
  'under the radar',
  'without permit', 
  'secret', 
  'underground',
  'unreported',
  'tax-free',
  'no paperwork',
  'no documentation',
  'discreet',
  'confidential',
  'not regulated',
  'bypass',
  'evade',
];

// Check for minimum content length to prevent empty or very short descriptions
const MIN_DESCRIPTION_LENGTH = 20;

// Check for excessive capitalization (spammy look)
const MAX_CAPS_PERCENTAGE = 30; // max percentage of capital letters allowed

/**
 * Check if a job post contains any prohibited content
 */
export function filterJobContent(title: string, description: string): ContentFilterResult {
  // Combine title and description for analysis
  const fullText = `${title} ${description}`.toLowerCase();

  // Check for minimum content
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return { 
      isApproved: false, 
      reason: "Job description is too short. Please provide more details about the job."
    };
  }

  // Check excessive capitalization
  const capsCount = (title + description).replace(/[^A-Z]/g, '').length;
  const totalCount = (title + description).replace(/\s/g, '').length;
  const capsPercentage = (capsCount / totalCount) * 100;

  if (capsPercentage > MAX_CAPS_PERCENTAGE) {
    return {
      isApproved: false,
      reason: "Excessive use of capital letters. Please use standard capitalization."
    };
  }

  // Check for prohibited content categories
  for (const [category, patterns] of Object.entries(PROHIBITED_CONTENT)) {
    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        return {
          isApproved: false,
          reason: `Your post contains prohibited content related to ${category}. Please review our Terms of Service.`
        };
      }
    }
  }

  // Check for suspicious keywords
  const suspiciousFound = SUSPICIOUS_KEYWORDS.filter(keyword => 
    fullText.includes(keyword.toLowerCase())
  );

  if (suspiciousFound.length > 0) {
    return {
      isApproved: false,
      reason: "Your post contains terms that suggest potentially inappropriate activity. Please review our Terms of Service."
    };
  }

  // Check for repetitive text (spam indicator)
  const words = fullText.split(/\s+/);
  const uniqueWords = new Set(words);

  if (words.length > 20 && uniqueWords.size / words.length < 0.5) {
    return {
      isApproved: false,
      reason: "Your post contains repetitive content which may be considered spam."
    };
  }

  return { isApproved: true };
}

/**
 * Filters and validates payment amounts to prevent unrealistic values
 */
export function validatePaymentAmount(amount: number): ContentFilterResult {
  if (amount < 10) {
    return {
      isApproved: false,
      reason: "Minimum payment amount is $10"
    };
  }

  if (amount > 10000) {
    return {
      isApproved: false, 
      reason: "Maximum payment amount is $10,000"
    };
  }

  return { isApproved: true };
}