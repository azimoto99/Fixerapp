import { Star, StarHalf } from 'lucide-react';

interface RatingDisplayProps {
  rating: number;
  count?: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RatingDisplay({ 
  rating, 
  count = 0, 
  showCount = true, 
  size = 'md',
  className = ''
}: RatingDisplayProps) {
  // Round to nearest half
  const roundedRating = Math.round(rating * 2) / 2;
  
  // Size classes
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const starSize = sizeClasses[size];
  
  // Generate stars array
  const stars = [];
  const totalStars = 5;
  
  for (let i = 1; i <= totalStars; i++) {
    if (i <= roundedRating) {
      // Full star
      stars.push(
        <Star key={i} className={`${starSize} fill-yellow-400 text-yellow-400`} />
      );
    } else if (i - 0.5 === roundedRating) {
      // Half star
      stars.push(
        <StarHalf key={i} className={`${starSize} fill-yellow-400 text-yellow-400`} />
      );
    } else {
      // Empty star
      stars.push(
        <Star key={i} className={`${starSize} text-gray-300`} />
      );
    }
  }
  
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex mr-1">
        {stars}
      </div>
      {showCount && count > 0 && (
        <span className="text-xs text-gray-500">
          ({count})
        </span>
      )}
    </div>
  );
}