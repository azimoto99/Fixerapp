// Phone utility functions for call/text functionality

export const handlePhoneCall = (phoneNumber: string) => {
  if (phoneNumber) {
    // Remove any non-numeric characters except + for international numbers
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanNumber}`;
  }
};

export const handleTextMessage = (phoneNumber: string, message?: string) => {
  if (phoneNumber) {
    // Remove any non-numeric characters except + for international numbers
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const smsUrl = message 
      ? `sms:${cleanNumber}?body=${encodeURIComponent(message)}`
      : `sms:${cleanNumber}`;
    window.location.href = smsUrl;
  }
};

export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  // Basic phone number validation - at least 10 digits
  const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
  return cleanNumber.length >= 10;
};

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Format phone number for display (US format)
  const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
  if (cleanNumber.length === 10) {
    return `(${cleanNumber.slice(0, 3)}) ${cleanNumber.slice(3, 6)}-${cleanNumber.slice(6)}`;
  } else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
    return `+1 (${cleanNumber.slice(1, 4)}) ${cleanNumber.slice(4, 7)}-${cleanNumber.slice(7)}`;
  }
  return phoneNumber; // Return original if not standard format
}; 