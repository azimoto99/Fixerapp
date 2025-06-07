/**
 * Content filter for blocking illegal, inappropriate, or spam job postings
 */

export type ContentFilterResult = {
  isApproved: boolean;
  reason?: string;
};

export function filterJobContent(title: string, description: string) {
  const prohibitedTerms = [
    'scam',
    'illegal',
    'fraud',
    'fake',
    'spam',
    'inappropriate',
    'adult',
    'drugs',
    'weapons',
    'violence'
  ];

  const containsProhibitedTerm = (text: string) => {
    const lowerText = text.toLowerCase();
    return prohibitedTerms.some(term => lowerText.includes(term));
  };

  if (containsProhibitedTerm(title) || containsProhibitedTerm(description)) {
    return {
      isApproved: false,
      reason: 'Content contains prohibited terms'
    };
  }

  if (!title.trim() || !description.trim()) {
    return {
      isApproved: false,
      reason: 'Title and description are required'
    };
  }

  // More lenient minimum length requirements
  if (title.length < 3) {
    return {
      isApproved: false,
      reason: 'Title must be at least 3 characters'
    };
  }

  if (description.length < 5) {
    return {
      isApproved: false,
      reason: 'Description must be at least 5 characters'
    };
  }

  return {
    isApproved: true
  };
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