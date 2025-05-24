import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TicketAttachments } from '@/components/TicketAttachments';
import { Clock, User, AlertCircle, CheckCircle, XCircle, MessageSquare, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TicketMessage {
  id: number;
  message: string;
  senderId: number;
  senderName: string;
  senderType: 'user' | 'admin';
  createdAt: string;
  ticketId: number;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    uploadedAt: string;
    url?: string;
  }>;
}

export function TicketMessagesDisplay({ messages, ticket }: { messages: TicketMessage[], ticket: SupportTicket }) {
  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className={`flex gap-2 ${message.senderType === 'admin' ? 'justify-end' : ''}`}>
          <div className={`rounded-lg p-3 max-w-[80%] ${message.senderType === 'admin' ? 'bg-primary/10' : 'bg-muted'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{message.senderName}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm">{message.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  userId: number;
  userName?: string;
  assignedTo?: number;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

interface EnhancedTicketDialogProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdate: (ticketId: number, updates: Partial<SupportTicket>) => Promise<void>;
  onMessageSend: (ticketId: number, message: string, attachments?: File[]) => Promise<void>;
  isAdmin?: boolean;
}

export function EnhancedTicketDialog({
  ticket,
  open,
  onOpenChange,
  onTicketUpdate,
  onMessageSend,
  isAdmin = false
}: EnhancedTicketDialogProps) {
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState<string>(ticket?.priority || 'medium');
  const [status, setStatus] = useState<string>(ticket?.status || 'open');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  if (!ticket) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-orange-500 text-white';
      case 'resolved': return 'bg-green-500 text-white';
      case 'closed': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await onMessageSend(ticket.id, newMessage);
      setNewMessage('');
      toast({
        title: "Message sent",
        description: "Your message has been added to the ticket",
      });
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (priority === ticket.priority && status === ticket.status) return;

    setUpdating(true);
    try {
      await onTicketUpdate(ticket.id, { priority: priority as any, status: status as any });
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to update ticket",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Support Ticket #{ticket.ticketNumber}
            {getStatusIcon(ticket.status)}
          </DialogTitle>
          <DialogDescription>{ticket.subject}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Ticket Info Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{ticket.category}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {formatDate(ticket.createdAt)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {ticket.userName || `User ${ticket.userId}`}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(ticket.updatedAt)}
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Controls */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(priority !== ticket.priority || status !== ticket.status) && (
                  <Button 
                    onClick={handleUpdateTicket} 
                    disabled={updating}
                    className="mt-4"
                  >
                    {updating ? 'Updating...' : 'Update Ticket'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          {ticket.messages && ticket.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages ({ticket.messages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {ticket.messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={message.senderType === 'admin' ? 'default' : 'secondary'}>
                          {message.senderType === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                        <span className="font-medium">{message.senderName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <TicketAttachments 
                        attachments={message.attachments}
                        readonly={true}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="min-h-[100px]"
                />
              </div>
              
              <TicketAttachments
                ticketId={ticket.id}
                onAttachmentUpload={async (file) => {
                  // Handle file upload for new messages
                  console.log('File upload for message:', file);
                }}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || sending}
          >
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}