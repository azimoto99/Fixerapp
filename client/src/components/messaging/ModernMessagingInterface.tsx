import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection with safe error handling
  const webSocketState = useSafeWebSocket();

  const {
    isConnected,
    status = 'disconnected' as 'disconnected' | 'connecting' | 'connected',
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
  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError,
  } = useQuery({
    queryKey: ['messages', contactId, currentUserId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/messages?contactId=${contactId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      return data.map((msg: any) => ({
        ...msg,
        sentAt: new Date(msg.sentAt || msg.createdAt), // Normalize timestamp
        readAt: msg.readAt ? new Date(msg.readAt) : undefined,
      }));
    },
    enabled: !!contactId && !!currentUserId,
    refetchInterval: isConnected ? 60000 : 15000, // Less frequent polling
    staleTime: 5000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments?: File[] }) => {
      // Handle file uploads first if any
      let attachmentUrl = undefined;
      let attachmentType = undefined;
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        formData.append('file', attachments[0]);
        const uploadResponse = await apiRequest('POST', '/api/messages/upload-attachment', formData);
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload attachment');
        }
        const uploadData = await uploadResponse.json();
        attachmentUrl = uploadData.attachmentUrl;
        attachmentType = uploadData.attachmentType;
      }

      const response = await apiRequest('POST', '/api/messages/send', {
        recipientId: contactId,
        content,
        ...(replyTo && { replyToId: replyTo.id }),
        ...(attachmentUrl && { attachmentUrl }),
        ...(attachmentType && { attachmentType })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', contactId, currentUserId] });
      setReplyTo(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  // Mutation for initiating a call
  const initiateCallMutation = useMutation({
    mutationFn: async (recipientId: number) => {
      const response = await apiRequest('POST', '/api/messages/initiate-call', { recipientId });
      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call Initiated",
        description: "Your call has been initiated successfully. Call SID: " + data.callSid,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate call",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom with improved reliability
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Scroll to bottom when new messages arrive or when the interface opens
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Also scroll when the component first loads and when contact changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100); // Small delay to ensure messages are rendered
    return () => clearTimeout(timer);
  }, [contactId, scrollToBottom]);

  // Join room on mount  
  useEffect(() => {
    if (contactId && currentUserId) {
      const roomId = Math.min(currentUserId, contactId) * 10000 + Math.max(currentUserId, contactId);
      joinRoom(roomId);
    }
    
    return () => {
      if (contactId && currentUserId) {
        const roomId = Math.min(currentUserId, contactId) * 10000 + Math.max(currentUserId, contactId);
        leaveRoom(roomId);
      }
    };
  }, [contactId, currentUserId, joinRoom, leaveRoom]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!typingUsers.includes(contactId)) {
      startTyping(contactId);
    }
  }, [typingUsers, startTyping, contactId]);

  const handleTypingStop = useCallback(() => {
    if (typingUsers.includes(contactId)) {
      stopTyping(contactId);
    }
  }, [typingUsers, stopTyping, contactId]);

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

  // Handle call initiation
  const handleCall = useCallback(() => {
    initiateCallMutation.mutate(contactId);
  }, [contactId]);

  // Handle video call initiation (placeholder for future implementation)
  const handleVideoCall = useCallback(() => {
    toast({
      title: "Video Call",
      description: "Video call functionality will be implemented soon.",
    });
  }, []);

  // Memoize grouped messages to prevent re-computation on every render
  const groupedMessages = useMemo(() => {
    return messages.reduce((groups: MessageData[][], message: MessageData, index: number) => {
      const prevMessage = messages[index - 1];
      const shouldGroup = prevMessage && 
        prevMessage.senderId === message.senderId &&
        (new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime()) < 60000; // 1 minute

      if (shouldGroup) {
        groups[groups.length - 1].push(message);
      } else {
        groups.push([message]);
      }
      
      return groups;
    }, []);
  }, [messages]);

  const typingUsersData = useMemo(() => {
    if (typingUsers.includes(contactId)) {
      return [{ id: contactId, name: contactName, avatar: contactAvatar }];
    }
    return [];
  }, [typingUsers, contactId, contactName, contactAvatar]);

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      <ConversationHeader
        contactName={contactName}
        contactUsername={contactUsername}
        contactAvatar={contactAvatar}
        isOnline={onlineUsers.includes(contactId)}
        connectionStatus={status as any}
        onBack={onBack}
        onCall={handleCall}
        onVideoCall={handleVideoCall}
      />
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center items-center h-full">
              <p>Loading messages...</p>
            </div>
          ) : isError ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-destructive">Failed to load messages.</p>
            </div>
          ) : (
            groupedMessages.map((group: MessageData[], index: number) => (
              <div key={index} className="space-y-1">
                {group.map((message: MessageData) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === currentUserId}
                    onReply={handleReply}
                    onReact={handleReact}
                  />
                ))}
              </div>
            ))
          )}
          {/* Invisible div to mark the end of messages for scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        {typingUsers.includes(contactId) && (
          <div className="mb-2">
            <TypingIndicator users={typingUsersData} />
          </div>
        )}
        <MessageInput
          value={messageText}
          onChange={setMessageText}
          onSend={handleSendMessage}
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
