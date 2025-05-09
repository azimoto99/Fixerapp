import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a Date object to a readable time string
 * @param date - The Date object to format
 * @param forInput - If true, return in format for time input (HH:MM), otherwise return readable format
 * @returns Formatted time string
 */
export function formatTime(date: Date, forInput: boolean = false): string {
  if (!date) return '';
  
  try {
    if (forInput) {
      return date.toTimeString().slice(0, 5); // HH:MM format for inputs
    }
    
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error("Error formatting time:", error);
    return '';
  }
}

/**
 * Format a price to USD
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * Format a price to USD (alias for formatPrice for backward compatibility)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return formatPrice(amount);
}

/**
 * Format a date to a human-readable string
 * @param date - The date to format
 * @param includeTime - Whether to include the time in the formatted string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, includeTime: boolean = false): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  try {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    
    if (includeTime) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return '';
  }
}

/**
 * Format a date and time to a human-readable string (alias for formatDate with includeTime=true)
 * @param date - The date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, true);
}

/**
 * Calculate distance between two points in miles
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  // Haversine formula
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Format a distance to a human-readable string
 * @param distance - The distance in miles
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return "< 0.1 miles";
  } else if (distance < 1) {
    // Format fraction of a mile
    const formatted = Math.round(distance * 10) / 10;
    return `${formatted} miles`;
  } else {
    // Format distances of 1 mile or more
    return `${parseFloat(distance.toFixed(1))} miles`;
  }
}

/**
 * Get a human-readable time ago string
 * @param date - The date to calculate time ago from
 * @returns Human-readable time ago string
 */
export function getTimeAgo(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000); // years
  if (interval >= 1) {
    return interval === 1 ? "1 year ago" : `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000); // months
  if (interval >= 1) {
    return interval === 1 ? "1 month ago" : `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 86400); // days
  if (interval >= 1) {
    return interval === 1 ? "1 day ago" : `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600); // hours
  if (interval >= 1) {
    return interval === 1 ? "1 hour ago" : `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60); // minutes
  if (interval >= 1) {
    return interval === 1 ? "1 minute ago" : `${interval} minutes ago`;
  }
  
  return "just now";
}

/**
 * Get an icon for a job category
 * @param category - The job category
 * @returns Icon name without the 'ri-' prefix
 */
export function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    "Home Maintenance": "home-gear-line",
    "Cleaning": "brush-line",
    "Delivery": "truck-line",
    "Event Help": "calendar-event-line",
    "Moving": "luggage-cart-line",
    "Tech Support": "computer-line",
    "Shopping": "shopping-cart-line",
    "Pet Care": "footprint-line",
    "Tutoring": "book-open-line",
    "Other": "question-line"
  };
  
  return iconMap[category] || "briefcase-line";
}

/**
 * Get a color for a job category
 * @param category - The job category
 * @returns Tailwind color class
 */
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    "Home Maintenance": "text-blue-500",
    "Cleaning": "text-green-500",
    "Delivery": "text-yellow-500",
    "Event Help": "text-purple-500",
    "Moving": "text-orange-500",
    "Tech Support": "text-cyan-500",
    "Shopping": "text-pink-500",
    "Pet Care": "text-teal-500",
    "Tutoring": "text-indigo-500",
    "Other": "text-gray-500"
  };
  
  return colorMap[category] || "text-primary";
}