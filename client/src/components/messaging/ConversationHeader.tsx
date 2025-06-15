import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical, 
  Search,
  Info,
  Wifi,
  WifiOff,
  Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationHeaderProps {
  contactName: string;
  contactUsername?: string;
  contactAvatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  onBack?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onInfo?: () => void;
  onBlock?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ConversationHeader({
  contactName,
  contactUsername,
  contactAvatar,
  isOnline = false,
  lastSeen,
  isTyping = false,
  connectionStatus = 'connected',
  onBack,
  onCall,
  onVideoCall,
  onSearch,
  onInfo,
  onBlock,
  onDelete,
  className
}: ConversationHeaderProps) {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getStatusText = (): string => {
    if (isTyping) return 'typing...';
    if (isOnline) return 'online';
    if (lastSeen) return `last seen ${formatLastSeen(lastSeen)}`;
    return 'offline';
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-500" />;
      case 'connecting':
        return <Wifi className="h-3 w-3 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-xl",
      "sticky top-0 z-20 shadow-sm",
      className
    )}>
      {/* Left Section - Back Button & Contact Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-full hover:bg-accent shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Contact Avatar with Online Indicator */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
            <AvatarImage src={contactAvatar} alt={contactName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>
          
          {/* Online Status Indicator */}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <Circle className="h-3 w-3 fill-green-500 text-green-500 border border-background rounded-full" />
            </div>
          )}
        </div>

        {/* Contact Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {contactName}
            </h3>
            {connectionStatus !== 'connected' && getConnectionIcon()}
          </div>
          
          <div className="flex items-center gap-1">
            <p className={cn(
              "text-sm truncate transition-colors duration-200",
              isTyping 
                ? "text-primary font-medium animate-pulse" 
                : "text-muted-foreground",
              isOnline && !isTyping && "text-green-600"
            )}>
              {getStatusText()}
            </p>
            
            {contactUsername && !isTyping && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground truncate">
                  @{contactUsername}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Section - Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Call Button */}
        {onCall && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCall}
            className="h-9 w-9 rounded-full hover:bg-accent"
            title="Voice call"
          >
            <Phone className="h-4 w-4" />
          </Button>
        )}

        {/* Video Call Button */}
        {onVideoCall && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onVideoCall}
            className="h-9 w-9 rounded-full hover:bg-accent"
            title="Video call"
          >
            <Video className="h-4 w-4" />
          </Button>
        )}

        {/* Search Button */}
        {onSearch && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearch}
            className="h-9 w-9 rounded-full hover:bg-accent"
            title="Search in conversation"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-accent"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onInfo && (
              <DropdownMenuItem onClick={onInfo}>
                <Info className="h-4 w-4 mr-2" />
                Contact Info
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onBlock && (
              <DropdownMenuItem onClick={onBlock} className="text-yellow-600">
                <Circle className="h-4 w-4 mr-2" />
                Block Contact
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Circle className="h-4 w-4 mr-2" />
                Delete Conversation
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default ConversationHeader;
