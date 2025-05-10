import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Home, Briefcase, HeartPulse, GraduationCap, PackageOpen, PaintBucket, DumbbellIcon, Car, Wrench, Leaf, Coffee, Baby, Zap, Wrench as WrenchPlumbing, Construction, Scissors, Pencil } from "lucide-react";

/**
 * Utility for conditionally joining Tailwind CSS classes
 * Uses clsx for conditional logic and tailwind-merge to handle conflicting classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in USD
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a distance in miles
 */
export function formatDistance(miles: number) {
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format a date/time
 */
export function formatDateTime(date: Date | string | number) {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
}

/**
 * Format a date
 */
export function formatDate(date: Date | string | number) {
  const dateObj = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: string) {
  const icons: Record<string, any> = {
    'Cleaning': Home,
    'Pet Care': HeartPulse,
    'Tutoring': GraduationCap,
    'Organization': PackageOpen,
    'Decoration': PaintBucket,
    'Heavy Lifting': DumbbellIcon,
    'Driving': Car,
    'Computer Repair': Wrench,
    'Gardening': Leaf,
    'Cooking': Coffee,
    'Child Care': Baby,
    'Electrical': Zap,
    'Plumbing': WrenchPlumbing,
    'Carpentry': Construction,
    'Haircut': Scissors,
    'Writing': Pencil,
    'Other': Briefcase
  };
  
  return icons[category] || Briefcase;
}

/**
 * Get category color
 */
export function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Cleaning': 'bg-blue-100 text-blue-800',
    'Pet Care': 'bg-pink-100 text-pink-800',
    'Tutoring': 'bg-purple-100 text-purple-800',
    'Organization': 'bg-indigo-100 text-indigo-800',
    'Decoration': 'bg-orange-100 text-orange-800',
    'Heavy Lifting': 'bg-gray-100 text-gray-800',
    'Driving': 'bg-green-100 text-green-800',
    'Computer Repair': 'bg-teal-100 text-teal-800',
    'Gardening': 'bg-emerald-100 text-emerald-800',
    'Cooking': 'bg-amber-100 text-amber-800',
    'Child Care': 'bg-rose-100 text-rose-800',
    'Electrical': 'bg-yellow-100 text-yellow-800',
    'Plumbing': 'bg-cyan-100 text-cyan-800',
    'Carpentry': 'bg-stone-100 text-stone-800',
    'Haircut': 'bg-violet-100 text-violet-800',
    'Writing': 'bg-slate-100 text-slate-800',
    'Other': 'bg-gray-100 text-gray-800'
  };
  
  return colors[category] || 'bg-gray-100 text-gray-800';
}