import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  users: Array<{
    id: number;
    name: string;
    avatar?: string;
  }>;
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getTypingText = (): string => {
    if (users.length === 1) {
      return `${users[0].name} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing...`;
    } else {
      return `${users[0].name} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground",
      "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
      className
    )}>
      {/* User Avatars */}
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {/* Typing Text */}
      <span className="text-primary font-medium">
        {getTypingText()}
      </span>

      {/* Animated Dots */}
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
      </div>
    </div>
  );
}

export default TypingIndicator;
