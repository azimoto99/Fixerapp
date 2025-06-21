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
import {
  Search,
  X,
  Send,
  MessageSquare,
  UserPlus,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Video,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Circle,
  Zap,
  Wifi,
  WifiOff
} from "lucide-react";
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

// Import our new modern messaging components
import { ContactList, type Contact } from './messaging/ContactList';
import { ModernMessagingInterface } from './messaging/ModernMessagingInterface';

// Legacy types for backward compatibility
type LegacyContact = {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("contacts");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);

  const { data: legacyContacts = [], isLoading: contactsLoading, error: contactsError } = useQuery({
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

  // Transform legacy contacts to modern Contact interface
  const contacts: Contact[] = legacyContacts.map((contact: LegacyContact) => ({
    id: contact.id,
    name: contact.fullName || contact.username,
    username: contact.username,
    avatar: contact.avatarUrl || undefined,
    lastMessage: contact.lastMessage ? {
      content: contact.lastMessage,
      timestamp: new Date(),
      isRead: true,
      senderId: contact.id
    } : undefined,
    unreadCount: 0,
    isOnline: false,
    isPinned: false,
    isArchived: false,
    isTyping: false
  }));





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

  // Reset states when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectedContactId(null);
      setSearchQuery("");
      setTab("contacts");
    }
  }, [open]);

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
    // Stay on the contacts tab since the messaging interface is rendered within it
    // setTab('messages'); // Remove this line - there's no 'messages' tab
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



  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col w-[400px] sm:max-w-md p-0">
        {/* Modern header with clean design */}
        <div className="px-4 py-4 border-b flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Messages</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Secure & encrypted</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-full hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-grow h-full">
          <TabsList className="grid grid-cols-3 mx-4 mt-4 mb-3 bg-muted/30 p-1 rounded-xl">
            <TabsTrigger value="contacts" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              <span className="font-medium">Chats</span>
              {contacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-2 text-xs rounded-full">
                  {contacts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Mail className="h-4 w-4" />
              <span className="font-medium">Requests</span>
              {receivedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-2 text-xs rounded-full">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <UserPlus className="h-4 w-4" />
              <span className="font-medium">Add</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="flex flex-col flex-grow h-full m-0 p-0">
            {selectedContactId ? (
              <ModernMessagingInterface
                contactId={selectedContactId}
                contactName={contacts.find(c => c.id === selectedContactId)?.name || 'Unknown'}
                contactUsername={contacts.find(c => c.id === selectedContactId)?.username}
                contactAvatar={contacts.find(c => c.id === selectedContactId)?.avatar}
                currentUserId={currentUser?.id || 0}
                onBack={() => setSelectedContactId(null)}
              />
            ) : (
              <div className="flex flex-col h-full">
                {/* Search Bar */}
                <div className="px-4 py-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      className="pl-10 bg-muted/30 border-0 focus-visible:ring-1"
                    />
                  </div>
                </div>

                {/* Contact List */}
                <ContactList
                  contacts={contacts}
                  selectedContactId={selectedContactId}
                  onContactSelect={handleContactSelect}
                  onContactCall={(contactId) => console.log('Call:', contactId)}
                  onContactVideoCall={(contactId) => console.log('Video call:', contactId)}
                  onContactPin={(contactId) => console.log('Pin:', contactId)}
                  onContactArchive={(contactId) => console.log('Archive:', contactId)}
                  onContactDelete={(contactId) => console.log('Delete:', contactId)}
                  isLoading={contactsLoading}
                  className="flex-1"
                />
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