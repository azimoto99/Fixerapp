import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} miles away`;
}

export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 30) {
    return `${diffDays}d ago`;
  } else {
    return past.toLocaleDateString();
  }
}

export function getCategoryIcon(category: string): string {
  switch(category) {
    case 'Home Maintenance':
      return 'home-gear-line';
    case 'Cleaning':
      return 'brush-line';
    case 'Delivery':
      return 'truck-line';
    case 'Event Help':
      return 'calendar-event-line';
    case 'Moving':
      return 'home-8-line';
    case 'Tech Support':
      return 'computer-line';
    case 'Shopping':
      return 'shopping-basket-line';
    case 'Pet Care':
      return 'footprint-line';
    case 'Tutoring':
      return 'book-open-line';
    default:
      return 'briefcase-line';
  }
}

export function getCategoryColor(category: string): string {
  switch(category) {
    case 'Home Maintenance':
      return 'primary';
    case 'Cleaning':
      return 'cyan';
    case 'Delivery':
      return 'secondary';
    case 'Event Help':
      return 'purple';
    case 'Moving':
      return 'indigo';
    case 'Tech Support':
      return 'amber';
    case 'Shopping':
      return 'rose';
    case 'Pet Care':
      return 'green';
    case 'Tutoring':
      return 'blue';
    default:
      return 'gray';
  }
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
