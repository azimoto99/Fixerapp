import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Users, 
  UserPlus,
  Settings,
  MoreVertical, 
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
  editedAt?: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  senderName?: string;
  senderAvatar?: string;
  readReceipts?: { userId: number; readAt: Date; userName: string; }[];
}

interface Conversation {
  id: number;
  jobId?: number;
  type: 'direct' | 'group' | 'job_group';
  title: string;
  createdBy: number;
  createdAt: Date;
  lastMessageAt?: Date;
  participants: {
    id: number;
    userId: number;
    userName: string;
    userAvatar?: string;
    role: 'member' | 'admin' | 'owner';
    joinedAt: Date;
    isActive: boolean;
  }[];
}

interface GroupMessagingInterfaceProps {
  conversationId: number;
  currentUserId: number;
  onClose?: () => void;
  className?: string;
}

export function GroupMessagingInterface({
  conversationId,
  currentUserId,
  onClose,
  className = ''
}: GroupMessagingInterfaceProps) {
  const [messageText, setMessageText] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
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

  // Fetch conversation messages
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json() as GroupMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: 3000 // Poll for new messages every 3 seconds
  });

  // Fetch potential participants (job applicants + poster)
  const { data: potentialParticipants = [] } = useQuery({
    queryKey: ['job-participants', conversation?.jobId],
    queryFn: async () => {
      if (!conversation?.jobId) return [];
      const response = await apiRequest('GET', `/api/jobs/${conversation.jobId}/participants`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!conversation?.jobId
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
      refetchMessages();
      scrollToBottom();
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

  // Add participants mutation
  const addParticipantsMutation = useMutation({
    mutationFn: async (participants: number[]) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/participants`, {
        participants
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add participants');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      setShowAddParticipants(false);
      setSelectedParticipants([]);
      toast({
        title: "Participants added",
        description: "New participants have been added to the conversation.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add participants",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll to bottom when new messages arrive
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

    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      // Error is handled by the mutation
      setMessageText(content); // Restore message text on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddParticipants = () => {
    if (selectedParticipants.length === 0) return;
    addParticipantsMutation.mutate(selectedParticipants);
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

  const getMessageStatusIcon = (message: GroupMessage) => {
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const currentUserRole = conversation?.participants.find(p => p.userId === currentUserId)?.role;
  const canAddParticipants = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (conversationLoading) {
    return (
      <div className={`flex items-center justify-center h-full bg-background border rounded-lg ${className}`}>
        <div className="text-center">
          <Circle className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className={`flex items-center justify-center h-full bg-background border rounded-lg ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Conversation not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background border rounded-lg ${className}`}>
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowParticipants(true)}
          >
            <Users className="h-4 w-4" />
          </Button>
          {canAddParticipants && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAddParticipants(true)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
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
              messages.map((message, index) => {
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
                          <div className="flex items-center space-x-1 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {sender?.userName}
                            </span>
                            {getRoleIcon(sender?.role || 'member')}
                          </div>
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
              })
            )}
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
                <div className="flex items-center space-x-2">
                  {getRoleIcon(participant.role)}
                  <Badge variant="secondary" className="text-xs">
                    {participant.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Participants Dialog */}
      <Dialog open={showAddParticipants} onOpenChange={setShowAddParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {potentialParticipants
                .filter(p => !conversation.participants.some(cp => cp.userId === p.id))
                .map((user: any) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants([...selectedParticipants, user.id]);
                      } else {
                        setSelectedParticipants(selectedParticipants.filter(id => id !== user.id));
                      }
                    }}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {user.username?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddParticipants(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddParticipants}
                disabled={selectedParticipants.length === 0 || addParticipantsMutation.isPending}
              >
                Add Participants
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 