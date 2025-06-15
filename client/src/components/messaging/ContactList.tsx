import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Circle, 
  MoreVertical, 
  Pin, 
  Archive,
  Trash2,
  MessageSquare,
  Phone,
  Video
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday } from 'date-fns';

export interface Contact {
  id: number;
  name: string;
  username?: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    timestamp: Date;
    isRead: boolean;
    senderId: number;
  };
  unreadCount?: number;
  isOnline?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
}

interface ContactListProps {
  contacts: Contact[];
  selectedContactId?: number;
  onContactSelect: (contactId: number) => void;
  onContactCall?: (contactId: number) => void;
  onContactVideoCall?: (contactId: number) => void;
  onContactPin?: (contactId: number) => void;
  onContactArchive?: (contactId: number) => void;
  onContactDelete?: (contactId: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function ContactList({
  contacts,
  selectedContactId,
  onContactSelect,
  onContactCall,
  onContactVideoCall,
  onContactPin,
  onContactArchive,
  onContactDelete,
  isLoading = false,
  className
}: ContactListProps) {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatMessageTime = (date: Date): string => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  // Sort contacts: pinned first, then by last message time
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    const aTime = a.lastMessage?.timestamp?.getTime() || 0;
    const bTime = b.lastMessage?.timestamp?.getTime() || 0;
    return bTime - aTime;
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-2 p-2", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-foreground mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation by adding contacts
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-1 p-2">
        {sortedContacts.map((contact) => (
          <div
            key={contact.id}
            className={cn(
              "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer",
              "transition-all duration-200 hover:bg-accent/50",
              selectedContactId === contact.id && "bg-accent shadow-sm",
              contact.isPinned && "bg-primary/5 border border-primary/10"
            )}
            onClick={() => onContactSelect(contact.id)}
          >
            {/* Pinned Indicator */}
            {contact.isPinned && (
              <Pin className="absolute top-2 right-2 h-3 w-3 text-primary opacity-60" />
            )}

            {/* Avatar with Online Status */}
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Online Status */}
              {contact.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5">
                  <Circle className="h-3 w-3 fill-green-500 text-green-500 border border-background rounded-full" />
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={cn(
                  "font-medium truncate",
                  contact.unreadCount && contact.unreadCount > 0 
                    ? "text-foreground" 
                    : "text-foreground/90"
                )}>
                  {contact.name}
                </h4>
                
                {contact.lastMessage && (
                  <span className={cn(
                    "text-xs shrink-0 ml-2",
                    contact.unreadCount && contact.unreadCount > 0
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}>
                    {formatMessageTime(contact.lastMessage.timestamp)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {contact.isTyping ? (
                    <p className="text-sm text-primary font-medium animate-pulse">
                      typing...
                    </p>
                  ) : contact.lastMessage ? (
                    <p className={cn(
                      "text-sm truncate",
                      contact.unreadCount && contact.unreadCount > 0
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}>
                      {contact.lastMessage.senderId === contact.id ? '' : 'You: '}
                      {truncateMessage(contact.lastMessage.content)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No messages yet
                    </p>
                  )}
                </div>

                {/* Unread Badge */}
                {contact.unreadCount && contact.unreadCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="ml-2 h-5 min-w-[20px] px-1.5 text-xs rounded-full"
                  >
                    {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Actions (appear on hover) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
              {onContactCall && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContactCall(contact.id);
                  }}
                  className="h-8 w-8 rounded-full"
                  title="Voice call"
                >
                  <Phone className="h-3 w-3" />
                </Button>
              )}

              {onContactVideoCall && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContactVideoCall(contact.id);
                  }}
                  className="h-8 w-8 rounded-full"
                  title="Video call"
                >
                  <Video className="h-3 w-3" />
                </Button>
              )}

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 rounded-full"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onContactPin && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onContactPin(contact.id);
                      }}
                    >
                      <Pin className="h-4 w-4 mr-2" />
                      {contact.isPinned ? 'Unpin' : 'Pin'} Chat
                    </DropdownMenuItem>
                  )}
                  {onContactArchive && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onContactArchive(contact.id);
                      }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Chat
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onContactDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onContactDelete(contact.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Chat
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default ContactList;
