/**
 * Real-time Messaging Interface for Job Conversations
 * Provides seamless chat experience with typing indicators, read receipts, and file sharing
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile,
  Check,
  CheckCheck,
  Circle,
  AlertCircle
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  jobId?: number;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  editedAt?: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  senderName?: string;
  senderAvatar?: string;
}

interface MessagingInterfaceProps {
  jobId?: number;
  recipientId: number;
  recipientName: string;
  recipientAvatar?: string;
  currentUserId: number;
  onClose?: () => void;
  className?: string;
}

export function MessagingInterface({
  jobId,
  recipientId,
  recipientName,
  recipientAvatar,
  currentUserId,
  onClose,
  className = ''
}: MessagingInterfaceProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();  // WebSocket connection with error handling
  let webSocketState;
  try {
    webSocketState = useWebSocket();
  } catch (error) {
    console.error('WebSocket context error:', error);
    // Fallback state when WebSocket is not available
    webSocketState = {
      isConnected: false,
      status: 'disconnected',
      messages: [],
      typingUsers: [],
      onlineUsers: [],
      sendMessage: () => false,
      joinRoom: () => false,
      leaveRoom: () => false,
      startTyping: () => false,
      stopTyping: () => false,
      markMessageAsRead: () => false
    };
  }

  const {
    isConnected,
    status,
    messages: wsMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    markMessageAsRead
  } = webSocketState;

  // Fetch conversation history
  const { data: conversationData = [], isLoading, error: conversationError } = useQuery({
    queryKey: ['messages', recipientId],
    enabled: !!recipientId,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/messages?contactId=${recipientId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      try {
        const response = await apiRequest('POST', '/api/messages/send', {
          content,
          recipientId,
          jobId
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to send message');
        }
        return response.json();
      } catch (error) {
        console.error('Send message mutation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      try {
        // Send via WebSocket for real-time delivery
        if (sendMessage && typeof sendMessage === 'function') {
          sendMessage(data.content, recipientId, jobId);
        }

        // Update local cache
        queryClient.invalidateQueries({ queryKey: ['messages', recipientId] });
      } catch (error) {
        console.error('Error in onSuccess handler:', error);
      }
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please check your connection and try again.",
        variant: "destructive"
      });
    }
  });
  // Join job room on mount
  useEffect(() => {
    try {
      if (jobId && isConnected && typeof joinRoom === 'function') {
        joinRoom(jobId);
        return () => {
          if (typeof leaveRoom === 'function') {
            leaveRoom(jobId);
          }
        };
      }
    } catch (error) {
      console.error('Error joining/leaving room:', error);
    }
  }, [jobId, isConnected, joinRoom, leaveRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    try {
      scrollToBottom();
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }, [conversationData, wsMessages]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    try {
      if (!isTyping) {
        setIsTyping(true);
        if (typeof startTyping === 'function') {
          startTyping(recipientId, jobId);
        }
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (typeof stopTyping === 'function') {
          stopTyping(recipientId, jobId);
        }
      }, 2000);
    } catch (error) {
      console.error('Error handling typing:', error);
    }
  }, [isTyping, startTyping, stopTyping, recipientId, jobId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    try {
      if (!messageText.trim()) return;

      const content = messageText.trim();
      setMessageText('');

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        if (typeof stopTyping === 'function') {
          stopTyping(recipientId, jobId);
        }
      }

      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message text on error
      setMessageText(messageText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTypingStart();
    }
  };

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.senderId !== currentUserId) return null;

    switch (message.status) {
      case 'sending':
        return <Circle className="h-3 w-3 text-muted-foreground animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };

  // Merge conversation data with WebSocket messages
  let allMessages = [];
  try {
    const safeConversationData = Array.isArray(conversationData) ? conversationData : [];
    const safeWsMessages = Array.isArray(wsMessages) ? wsMessages : [];

    allMessages = [...safeConversationData, ...safeWsMessages].sort(
      (a, b) => {
        try {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } catch (error) {
          console.error('Error sorting messages:', error);
          return 0;
        }
      }
    );
  } catch (error) {
    console.error('Error merging messages:', error);
    allMessages = Array.isArray(conversationData) ? conversationData : [];
  }

  const isRecipientOnline = Array.isArray(onlineUsers) ? onlineUsers.includes(recipientId) : false;
  const isRecipientTyping = Array.isArray(typingUsers) ? typingUsers.includes(recipientId) : false;

  return (
    <div className={`flex flex-col h-full bg-background border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback>
                {recipientName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isRecipientOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{recipientName}</h3>
            <p className="text-xs text-muted-foreground">
              {isRecipientOnline ? 'Online' : 'Last seen recently'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              ×
            </Button>
          )}
        </div>
      </div>      {/* Connection Status */}
      {!isConnected && (
        <div className="flex items-center justify-center p-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2 text-yellow-700 text-xs">
            <Circle className="h-3 w-3 animate-pulse" />
            <span>{status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {allMessages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const showAvatar = index === 0 || allMessages[index - 1].senderId !== message.senderId;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}
                >
                  <div className={`flex max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    {!isOwn && showAvatar && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={recipientAvatar} />
                        <AvatarFallback className="text-xs">
                          {recipientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        } ${
                          showAvatar ? 'rounded-tl-sm' : ''
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      <div className={`flex items-center space-x-1 mt-1 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(new Date(message.createdAt))}
                        </span>
                        {getMessageStatusIcon(message)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isRecipientTyping && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/20">
        <div className="flex items-end space-x-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mb-2">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] resize-none"
              disabled={sendMessageMutation.isPending}
            />
          </div>

          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mb-2">
            <Smile className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            size="sm"
            className="mb-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}