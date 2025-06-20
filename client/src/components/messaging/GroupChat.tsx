import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Users, 
  UserPlus,
  Check,
  CheckCheck,
  Circle,
  AlertCircle,
  Crown,
  Shield
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface GroupMessage {
  id: number;
  content: string;
  senderId: number;
  conversationId: number;
  createdAt: Date;
  senderName?: string;
  senderAvatar?: string;
}

interface Conversation {
  id: number;
  jobId?: number;
  title: string;
  participants: {
    id: number;
    userId: number;
    userName: string;
    userAvatar?: string;
    role: 'member' | 'admin' | 'owner';
  }[];
}

interface GroupChatProps {
  conversationId: number;
  currentUserId: number;
  onClose?: () => void;
}

export function GroupChat({ conversationId, currentUserId, onClose }: GroupChatProps) {
  const [messageText, setMessageText] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      return response.json() as Conversation;
    },
    enabled: !!conversationId
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading, refetch } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json() as GroupMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: 3000
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        content,
        messageType: 'text'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      scrollToBottom();
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    const content = messageText.trim();
    setMessageText('');
    await sendMessageMutation.mutateAsync(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  if (conversationLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Circle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2">
            {conversation.participants.slice(0, 3).map((participant) => (
              <Avatar key={participant.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={participant.userAvatar} />
                <AvatarFallback className="text-xs">
                  {participant.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {conversation.participants.length > 3 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium">+{conversation.participants.length - 3}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{conversation.title}</h3>
            <p className="text-xs text-muted-foreground">
              {conversation.participants.length} participants
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => setShowParticipants(true)}>
            <Users className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const sender = conversation.participants.find(p => p.userId === message.senderId);
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}
                >
                  <div className={`flex max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    {!isOwn && showAvatar && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={sender?.userAvatar} />
                        <AvatarFallback className="text-xs">
                          {sender?.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && showAvatar && (
                        <span className="text-xs font-medium text-muted-foreground mb-1">
                          {sender?.userName}
                        </span>
                      )}
                      
                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatMessageTime(new Date(message.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Participants Dialog */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participants ({conversation.participants.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversation.participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {participant.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{participant.userName}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {participant.role}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 