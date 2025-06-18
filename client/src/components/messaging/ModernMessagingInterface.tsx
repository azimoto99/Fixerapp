import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';

// Import our new components
import { MessageBubble, type MessageData } from './MessageBubble';
import { ConversationHeader } from './ConversationHeader';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

// Use actual WebSocket context instead of fallback
function useSafeWebSocket() {
  return useWebSocket();
}

interface ModernMessagingInterfaceProps {
  contactId: number;
  contactName: string;
  contactUsername?: string;
  contactAvatar?: string;
  currentUserId: number;
  onBack?: () => void;
  className?: string;
}

export function ModernMessagingInterface({
  contactId,
  contactName,
  contactUsername,
  contactAvatar,
  currentUserId,
  onBack,
  className
}: ModernMessagingInterfaceProps) {
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<MessageData | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection with safe error handling
  const webSocketState = useSafeWebSocket();

  const {
    isConnected,
    status,
    typingUsers,
    onlineUsers,
    sendMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    markMessageAsRead
  } = webSocketState;

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', contactId, currentUserId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/messages?contactId=${contactId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      return data.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.sentAt || msg.createdAt),
        readAt: msg.readAt ? new Date(msg.readAt) : undefined,
        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined
      }));
    },
    enabled: !!contactId && !!currentUserId,
    refetchInterval: 5000,
    staleTime: 10000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments?: File[] }) => {
      // Handle file uploads first if any
      let attachmentUrl = undefined;
      if (attachments && attachments.length > 0) {
        // TODO: Implement file upload logic
        console.log('File attachments not yet implemented:', attachments);
      }

      const response = await apiRequest('POST', '/api/messages/send', {
        recipientId: contactId,
        content,
        ...(replyTo && { replyToId: replyTo.id }),
        ...(attachmentUrl && { attachmentUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', contactId, currentUserId] });
      setReplyTo(null);
      scrollToBottom();
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  // Auto-scroll to bottom with improved reliability
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      });
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Add a small delay to ensure layout has settled
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollToBottom]);

  // Join room on mount
  useEffect(() => {
    if (contactId && currentUserId) {
      joinRoom(`conversation_${Math.min(currentUserId, contactId)}_${Math.max(currentUserId, contactId)}`);
    }
    
    return () => {
      if (contactId && currentUserId) {
        leaveRoom(`conversation_${Math.min(currentUserId, contactId)}_${Math.max(currentUserId, contactId)}`);
      }
    };
  }, [contactId, currentUserId, joinRoom, leaveRoom]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(contactId);
    }
  }, [isTyping, startTyping, contactId]);

  const handleTypingStop = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(contactId);
    }
  }, [isTyping, stopTyping, contactId]);

  // Handle send message
  const handleSendMessage = useCallback((content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    
    sendMessageMutation.mutate({ content, attachments });
  }, [sendMessageMutation]);

  // Handle reply
  const handleReply = useCallback((message: MessageData) => {
    setReplyTo(message);
  }, []);

  // Handle reactions (placeholder)
  const handleReact = useCallback((messageId: number, emoji: string) => {
    console.log('React to message:', messageId, emoji);
    // TODO: Implement reaction functionality
  }, []);

  // Group messages by sender and time
  const groupedMessages = messages.reduce((groups: MessageData[][], message: MessageData, index: number) => {
    const prevMessage = messages[index - 1];
    const shouldGroup = prevMessage && 
      prevMessage.senderId === message.senderId &&
      (message.createdAt.getTime() - prevMessage.createdAt.getTime()) < 60000; // 1 minute

    if (shouldGroup) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }
    
    return groups;
  }, []);

  // Get typing users for this conversation
  const conversationTypingUsers = typingUsers
    .filter(userId => userId === contactId)
    .map(userId => ({
      id: userId,
      name: contactName,
      avatar: contactAvatar
    }));

  const isContactOnline = onlineUsers.includes(contactId);

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0">
        <ConversationHeader
          contactName={contactName}
          contactUsername={contactUsername}
          contactAvatar={contactAvatar}
          isOnline={isContactOnline}
          isTyping={conversationTypingUsers.length > 0}
          connectionStatus={status}
          onBack={onBack}
          onCall={() => console.log('Call:', contactId)}
          onVideoCall={() => console.log('Video call:', contactId)}
          onSearch={() => console.log('Search in conversation')}
          onInfo={() => console.log('Contact info:', contactId)}
        />
      </div>

      {/* Messages Area - Flexible height */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-2">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-1">
                  {group.map((message, messageIndex) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.senderId === currentUserId}
                      showAvatar={messageIndex === group.length - 1}
                      showTimestamp={messageIndex === group.length - 1}
                      isGrouped={messageIndex < group.length - 1}
                      onReply={handleReply}
                      onReact={handleReact}
                    />
                  ))}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {conversationTypingUsers.length > 0 && (
              <TypingIndicator users={conversationTypingUsers} />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        <MessageInput
          value={messageText}
          onChange={setMessageText}
          onSend={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          disabled={!isConnected}
          isLoading={sendMessageMutation.isPending}
          replyTo={replyTo ? {
            id: replyTo.id,
            content: replyTo.content,
            senderName: replyTo.senderName || 'Unknown'
          } : null}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}

export default ModernMessagingInterface;
