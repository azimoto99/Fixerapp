import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Reply,
  MoreVertical,
  Heart,
  ThumbsUp
} from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';

export interface MessageData {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  editedAt?: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  senderName?: string;
  senderAvatar?: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  attachmentUrl?: string;
  replyTo?: MessageData;
  reactions?: Array<{ emoji: string; userId: number; userName: string }>;
}

interface MessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isGrouped?: boolean;
  onReply?: (message: MessageData) => void;
  onReact?: (messageId: number, emoji: string) => void;
  className?: string;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  isGrouped = false,
  onReply,
  onReact,
  className
}: MessageBubbleProps) {
  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const bubbleClasses = cn(
    "group relative max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200",
    "hover:shadow-md focus-within:shadow-md",
    isOwn
      ? "bg-primary text-primary-foreground ml-auto rounded-br-md"
      : "bg-card text-card-foreground border rounded-bl-md",
    isGrouped && !showTimestamp && (isOwn ? "rounded-tr-2xl" : "rounded-tl-2xl"),
    message.status === 'failed' && "border-destructive/50 bg-destructive/5",
    className
  );

  return (
    <div className={cn(
      "flex items-end gap-2 mb-1",
      isOwn ? "flex-row-reverse" : "flex-row",
      isGrouped && "mb-0.5"
    )}>
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {message.senderName?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Spacer when avatar is hidden but needed for alignment */}
      {!showAvatar && !isOwn && <div className="w-8" />}

      {/* Message Content */}
      <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
        {/* Reply Context */}
        {message.replyTo && (
          <div className={cn(
            "mb-1 px-3 py-1.5 rounded-lg border-l-2 bg-muted/50 text-xs max-w-xs",
            isOwn ? "border-l-primary-foreground/30" : "border-l-primary/30"
          )}>
            <p className="font-medium text-muted-foreground truncate">
              {message.replyTo.senderName}
            </p>
            <p className="truncate opacity-75">
              {message.replyTo.content}
            </p>
          </div>
        )}

        {/* Main Message Bubble */}
        <div className={bubbleClasses}>
          {/* Message Content */}
          <div className="relative">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
            
            {/* Edited Indicator */}
            {message.editedAt && (
              <span className={cn(
                "text-xs opacity-60 ml-2",
                isOwn ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                (edited)
              </span>
            )}
          </div>

          {/* Message Actions (appear on hover) */}
          <div className={cn(
            "absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "flex items-center gap-1 bg-background border rounded-full px-2 py-1 shadow-lg",
            isOwn ? "-left-16" : "-right-16"
          )}>
            <button
              onClick={() => onReact?.(message.id, '👍')}
              className="p-1 hover:bg-accent rounded-full transition-colors"
              title="React with thumbs up"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onReact?.(message.id, '❤️')}
              className="p-1 hover:bg-accent rounded-full transition-colors"
              title="React with heart"
            >
              <Heart className="h-3 w-3" />
            </button>
            <button
              onClick={() => onReply?.(message)}
              className="p-1 hover:bg-accent rounded-full transition-colors"
              title="Reply to message"
            >
              <Reply className="h-3 w-3" />
            </button>
            <button className="p-1 hover:bg-accent rounded-full transition-colors">
              <MoreVertical className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 max-w-xs">
            {message.reactions.map((reaction, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-0.5 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onReact?.(message.id, reaction.emoji)}
                title={`${reaction.userName} reacted with ${reaction.emoji}`}
              >
                {reaction.emoji}
              </Badge>
            ))}
          </div>
        )}

        {/* Timestamp and Status */}
        {showTimestamp && (
          <div className={cn(
            "flex items-center gap-1 mt-1 text-xs",
            isOwn ? "text-primary/70" : "text-muted-foreground"
          )}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {getStatusIcon()}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
