import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, X, Send, MessageSquare, UserPlus, Shield, AlertTriangle, CheckCircle, Clock, ArrowLeft, MoreVertical, Trash2, Users, UserCheck, UserX, Mail } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Contact = {
  id: number;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  lastMessage?: string | null;
};

type Message = {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  isRead: boolean;
  sentAt: string;
  readAt: string | null;
};

export type MessagingDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * MessagingDrawer component for managing user contacts and messages
 * Visually consistent with other drawer components in the application
 */
export function MessagingDrawer({ open, onOpenChange }: MessagingDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth(); // Use proper auth hook
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("contacts");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);

  const { data: contacts = [], isLoading: contactsLoading, error: contactsError } = useQuery({
    queryKey: ['/api/contacts', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const response = await apiRequest('GET', '/api/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
    enabled: open && !!currentUser?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });



  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messages', selectedContactId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !selectedContactId) {
        throw new Error('Missing authentication or contact ID');
      }
      const response = await apiRequest('GET', `/api/messages?contactId=${selectedContactId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    },
    enabled: open && selectedContactId !== null && !!currentUser?.id,
    refetchInterval: 5000, // Refresh messages every 5 seconds
    staleTime: 10000,
  });

  // Contact requests queries
  const { data: receivedRequests = [], isLoading: receivedRequestsLoading } = useQuery({
    queryKey: ['/api/contact-requests', 'received', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const response = await apiRequest('GET', '/api/contact-requests?type=received');
      if (!response.ok) {
        throw new Error('Failed to fetch received requests');
      }
      return response.json();
    },
    enabled: open && !!currentUser?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: sentRequests = [], isLoading: sentRequestsLoading } = useQuery({
    queryKey: ['/api/contact-requests', 'sent', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const response = await apiRequest('GET', '/api/contact-requests?type=sent');
      if (!response.ok) {
        throw new Error('Failed to fetch sent requests');
      }
      return response.json();
    },
    enabled: open && !!currentUser?.id,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { recipientId: number; content: string }) => {
      if (!currentUser?.id) {
        throw new Error('Please log in to send messages');
      }

      // Validate message content
      if (!messageData.content.trim()) {
        throw new Error('Message cannot be empty');
      }

      if (messageData.content.length > 1000) {
        throw new Error('Message is too long (maximum 1000 characters)');
      }

      const response = await apiRequest('POST', '/api/messages/send', messageData);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(error.message || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      if (selectedContactId) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedContactId, currentUser?.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/contacts', currentUser?.id] });
      }

      // Show success feedback
      toast({
        title: "Message sent",
        description: "Your message has been delivered successfully",
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      console.error('Send message error:', error);
      toast({
        title: "Failed to Send Message",
        description: error.message || "Please check your connection and try again",
        variant: "destructive",
      });
    }
  });

  const sendContactRequestMutation = useMutation({
    mutationFn: async ({ receiverId, message }: { receiverId: number; message?: string }) => {
      if (!currentUser?.id) {
        throw new Error('Please log in to send contact requests');
      }

      if (receiverId === currentUser.id) {
        throw new Error('You cannot send a contact request to yourself');
      }

      // Check if already a contact
      const isAlreadyContact = contacts.some((contact: Contact) => contact.id === receiverId);
      if (isAlreadyContact) {
        throw new Error('This user is already in your contacts');
      }

      // Check if request already sent
      const requestAlreadySent = sentRequests.some((request: any) => request.receiverId === receiverId);
      if (requestAlreadySent) {
        throw new Error('Contact request already sent to this user');
      }

      const response = await apiRequest('POST', '/api/contact-requests/send', { receiverId, message });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send contact request' }));
        throw new Error(error.message || 'Failed to send contact request');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-requests', 'sent', currentUser?.id] });
      toast({
        title: "Contact Request Sent",
        description: "Your contact request has been sent successfully",
        duration: 3000,
      });
      setTab("requests");
      setSearchQuery(""); // Clear search after sending
    },
    onError: (error: Error) => {
      console.error('Send contact request error:', error);
      toast({
        title: "Failed to Send Request",
        description: error.message || "Please check your connection and try again",
        variant: "destructive",
      });
    }
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: 'accepted' | 'rejected' }) => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const response = await apiRequest('PUT', `/api/contact-requests/${requestId}`, { status });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to respond to contact request');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contact-requests', 'received', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', currentUser?.id] });
      toast({
        title: variables.status === 'accepted' ? "Request Accepted" : "Request Rejected",
        description: `Contact request has been ${variables.status} successfully`,
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Respond",
        description: error.message || "An error occurred while responding to the request",
        variant: "destructive",
      });
    }
  });

  const removeContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const response = await apiRequest('DELETE', `/api/contacts/${contactId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove contact');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setSelectedContactId(null);
      setShowDeleteDialog(false);
      setContactToDelete(null);
      toast({
        title: "Contact Removed",
        description: "User has been removed from your contacts",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove Contact",
        description: error.message || "An error occurred while removing the contact",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
      setContactToDelete(null);
    }
  });

  // Show authentication warning if user is not logged in
  useEffect(() => {
    if (open && !currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access messaging features",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  }, [open, currentUser, toast, onOpenChange]);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Reset states when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedContactId(null);
      setNewMessage("");
      setSearchQuery("");
      setTab("contacts");
    }
  }, [open]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContactId || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      recipientId: selectedContactId,
      content: newMessage.trim()
    });
  };

  const handleSendContactRequest = (receiverId: number) => {
    sendContactRequestMutation.mutate({ receiverId });
  };

  const handleDirectContactRequest = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast({
        title: "Username Required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (trimmedQuery.length < 3) {
      toast({
        title: "Username Too Short",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, try to find the user by username
      const response = await apiRequest('GET', `/api/users/search?username=${encodeURIComponent(trimmedQuery)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "User Not Found",
          description: errorData.message || "No user found with that username",
          variant: "destructive",
        });
        return;
      }

      const users = await response.json();
      if (!users || users.length === 0) {
        toast({
          title: "User Not Found",
          description: "No user found with that username",
          variant: "destructive",
        });
        return;
      }

      const user = users[0];

      // Check if it's the current user
      if (user.id === currentUser?.id) {
        toast({
          title: "Cannot Add Yourself",
          description: "You cannot send a contact request to yourself",
          variant: "destructive",
        });
        return;
      }

      // Check if already a contact
      const isAlreadyContact = contacts.some((contact: Contact) => contact.id === user.id);
      if (isAlreadyContact) {
        toast({
          title: "Already a Contact",
          description: "This user is already in your contacts",
          variant: "destructive",
        });
        return;
      }

      // Send contact request
      handleSendContactRequest(user.id);
      setSearchQuery(""); // Clear the input after sending

    } catch (error) {
      console.error('Error finding user:', error);
      toast({
        title: "Error",
        description: "Failed to find user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRespondToRequest = (requestId: number, status: 'accepted' | 'rejected') => {
    respondToRequestMutation.mutate({ requestId, status });
  };

  const handleRemoveContact = (contactId: number) => {
    setContactToDelete(contactId);
    setShowDeleteDialog(true);
  };

  const confirmRemoveContact = () => {
    if (contactToDelete) {
      removeContactMutation.mutate(contactToDelete);
    }
  };

  const handleContactSelect = (contactId: number) => {
    setSelectedContactId(contactId);
  };

  const getInitials = (name: string | null): string => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col w-[400px] sm:max-w-md p-0">
        {/* Enhanced header with security indicators */}
        <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur-xl z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Messages</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Secure messaging</p>
                <Shield className="h-3 w-3 text-green-500" />
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0 rounded-full hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-grow h-full">
          <TabsList className="grid grid-cols-3 mx-4 mt-3 mb-2 bg-muted/50">
            <TabsTrigger value="contacts" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
              {contacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {contacts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
              {receivedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="flex flex-col flex-grow h-full m-0 p-0">
            {selectedContactId ? (
              <div className="flex flex-col h-full">
                {/* Contact header */}
                <div className="px-4 py-2 border-b flex items-center justify-between">
                  {contacts.find((c: Contact) => c.id === selectedContactId) && (
                    <>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage 
                            src={(contacts.find((c: Contact) => c.id === selectedContactId) as Contact)?.avatarUrl || ""} 
                            alt={(contacts.find((c: Contact) => c.id === selectedContactId) as Contact)?.username} 
                          />
                          <AvatarFallback>
                            {getInitials((contacts.find((c: Contact) => c.id === selectedContactId) as Contact)?.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">
                            {(contacts.find((c: Contact) => c.id === selectedContactId) as Contact)?.fullName || 
                            (contacts.find((c: Contact) => c.id === selectedContactId) as Contact)?.username}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            @{(contacts.find((c: Contact) => c.id === selectedContactId) as Contact)?.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setSelectedContactId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Message area */}
                <ScrollArea className="flex-grow p-4">
                  <div className="flex flex-col space-y-3">
                    {messages.map((message: Message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.senderId === currentUser?.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === currentUser?.id 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* Message input */}
                <div className="p-4 border-t mt-auto">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Clock className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-foreground">Your contacts</h3>
                  <Badge variant="outline" className="text-xs">
                    {contactsLoading ? '...' : `${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`}
                  </Badge>
                </div>

                {contactsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-md">
                        <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : contactsError ? (
                  <div className="text-center p-6 border rounded-md bg-destructive/10 border-destructive/20">
                    <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-2" />
                    <p className="text-destructive font-medium">Failed to load contacts</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please try refreshing the page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-md">
                    {contacts.length === 0 ? (
                      <div className="text-center p-6 border rounded-md bg-muted/30">
                        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground font-medium">No contacts yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Use the Find Users tab to add contacts
                        </p>
                      </div>
                    ) : (
                      contacts.map((contact: Contact) => (
                        <div
                          key={contact.id}
                          className={`group p-3 cursor-pointer hover:bg-accent/50 border rounded-md transition-all duration-200 ${
                            selectedContactId === contact.id ? 'bg-accent border-accent shadow-sm' : 'bg-card hover:shadow-sm'
                          }`}
                          onClick={() => handleContactSelect(contact.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                              <AvatarImage src={contact.avatarUrl || ""} alt={contact.username} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {getInitials(contact.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-medium text-foreground">{contact.fullName || contact.username}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.lastMessage || 'No messages yet'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveContact(contact.id);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="flex flex-col h-full m-0 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Contact Requests</h3>
                <Shield className="h-3 w-3 text-green-500" title="Secure requests" />
              </div>
              <Badge variant="outline" className="text-xs">
                {receivedRequestsLoading ? '...' : `${receivedRequests.length} pending`}
              </Badge>
            </div>

            <ScrollArea className="flex-grow">
              {receivedRequestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-md">
                      <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : receivedRequests.length === 0 ? (
                <div className="text-center p-6 border rounded-md bg-muted/30">
                  <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground font-medium">No pending requests</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact requests from other users will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedRequests.map((request: any) => (
                    <div key={request.id} className="p-3 border rounded-md bg-card hover:shadow-sm transition-all">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          <AvatarImage src={request.avatarUrl || ""} alt={request.username} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(request.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground">{request.fullName || request.username}</h4>
                          <p className="text-sm text-muted-foreground">@{request.username}</p>
                          {request.message && (
                            <p className="text-sm text-foreground mt-1 p-2 bg-muted/50 rounded">
                              "{request.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleRespondToRequest(request.id, 'accepted')}
                          disabled={respondToRequestMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRespondToRequest(request.id, 'rejected')}
                          disabled={respondToRequestMutation.isPending}
                          className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sent Requests Section */}
              {sentRequests.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Sent Requests</h4>
                    <Badge variant="outline" className="text-xs">
                      {sentRequests.length} pending
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {sentRequests.map((request: any) => (
                      <div key={request.id} className="p-2 border rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.avatarUrl || ""} alt={request.username} />
                            <AvatarFallback className="text-xs">
                              {getInitials(request.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{request.fullName || request.username}</p>
                            <p className="text-xs text-muted-foreground">Pending response</p>
                          </div>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add" className="flex flex-col h-full m-0 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Add Contact</h3>
                <Shield className="h-3 w-3 text-green-500" title="Secure contact requests" />
              </div>
            </div>

            <div className="mb-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Enter Username
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter exact username..."
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Sanitize input - only allow alphanumeric and basic characters
                        const sanitizedValue = value.replace(/[^a-zA-Z0-9._-]/g, '');
                        setSearchQuery(sanitizedValue);
                      }}
                      className="pl-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          handleDirectContactRequest();
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the exact username of the person you want to add
                  </p>
                </div>

                <Button
                  onClick={handleDirectContactRequest}
                  disabled={!searchQuery.trim() || sendContactRequestMutation.isPending}
                  className="w-full"
                >
                  {sendContactRequestMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Contact Request
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex-grow">
              <div className="text-center p-6 border rounded-md bg-muted/30">
                <UserPlus className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-medium">Add contacts by username</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the exact username to send a contact request
                </p>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>Privacy Note:</strong> Users can only be added by their exact username.
                    No search or browsing functionality is available.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Delete Contact Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this contact? This will also delete your message history with them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setContactToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveContact}
              className="bg-destructive hover:bg-destructive/90"
              disabled={removeContactMutation.isPending}
            >
              {removeContactMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Contact
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}