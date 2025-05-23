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
import { useWebSocket } from '@/hooks/useWebSocket';
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
  const queryClient = useQueryClient();

  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    messages: wsMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    markMessageAsRead
  } = useWebSocket(currentUserId);

  // Fetch conversation history
  const { data: conversationData = [], isLoading } = useQuery({
    queryKey: ['/api/messages/conversation', recipientId, jobId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/messages/conversation?recipientId=${recipientId}${jobId ? `&jobId=${jobId}` : ''}`);
      return response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/messages', {
        content,
        recipientId,
        jobId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Send via WebSocket for real-time delivery
      sendMessage(data.content, recipientId, jobId);
      
      // Update local cache
      queryClient.invalidateQueries({
        queryKey: ['/api/messages/conversation', recipientId, jobId]
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: "Please check your connection and try again.",
        variant: "destructive"
      });
    }
  });

  // Join job room on mount
  useEffect(() => {
    if (jobId && isConnected) {
      joinRoom(jobId);
      return () => leaveRoom(jobId);
    }
  }, [jobId, isConnected, joinRoom, leaveRoom]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [conversationData, wsMessages]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(recipientId, jobId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(recipientId, jobId);
    }, 2000);
  }, [isTyping, startTyping, stopTyping, recipientId, jobId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const content = messageText.trim();
    setMessageText('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping(recipientId, jobId);
    }

    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      console.error('Failed to send message:', error);
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
  const allMessages = [...conversationData, ...wsMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const isRecipientOnline = onlineUsers.includes(recipientId);
  const isRecipientTyping = typingUsers.includes(recipientId);

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
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="flex items-center justify-center p-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2 text-yellow-700 text-xs">
            <Circle className="h-3 w-3 animate-pulse" />
            <span>{isConnecting ? 'Connecting...' : 'Reconnecting...'}</span>
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