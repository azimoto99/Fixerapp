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
import { Search, X, Send, MessageSquare, UserPlus, Shield, AlertTriangle, CheckCircle, Clock, ArrowLeft, MoreVertical, Trash2, Users } from "lucide-react";
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

  // Debounced search reference
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced search with debounce and security
  const {
    data: searchResults = [],
    isError: isSearchError,
    isLoading: isSearchLoading,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['/api/users/search', searchQuery, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      if (searchQuery.length < 3) {
        throw new Error('Search query too short');
      }

      try {
        const res = await apiRequest('GET', `/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('Not authorized to search users');
          }
          throw new Error('Failed to search users');
        }
        const data = await res.json();

        // Client-side filtering to ensure no sensitive data leaks
        const sanitizedResults = data.map((user: any) => ({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          // Remove sensitive fields
          email: undefined, // Don't expose emails in search
          phone: undefined,
          address: undefined
        }));

        return sanitizedResults;
      } catch (error) {
        console.error('Error in search query:', error);
        throw error;
      }
    },
    enabled: open && searchQuery.length >= 3 && tab === "search" && !!currentUser?.id,
    refetchOnWindowFocus: false,
    staleTime: 60000, // Cache results for 1 minute
    retry: 1 // Only retry once on failure
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

  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { recipientId: number; content: string }) => 
      apiRequest('POST', '/api/messages/send', messageData),
    onSuccess: () => {
      setNewMessage("");
      if (selectedContactId) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', selectedContactId] });
        queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  });

  const addContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }
      if (contactId === currentUser.id) {
        throw new Error('Cannot add yourself as a contact');
      }
      const response = await apiRequest('POST', '/api/contacts/add', { contactId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add contact');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', currentUser?.id] });
      toast({
        title: "Contact Added",
        description: "User has been added to your contacts successfully",
        duration: 3000,
      });
      setTab("contacts");
      setSearchQuery(""); // Clear search after adding
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Contact",
        description: error.message || "An error occurred while adding the contact",
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
    if (!newMessage.trim() || !selectedContactId) return;
    
    sendMessageMutation.mutate({
      recipientId: selectedContactId,
      content: newMessage.trim()
    });
  };

  const handleAddContact = (contactId: number) => {
    addContactMutation.mutate(contactId);
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
          <TabsList className="grid grid-cols-2 mx-4 mt-3 mb-2 bg-muted/50">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
              {contacts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {contacts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Find Users</span>
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
                      <Send className="h-4 w-4" />
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

          <TabsContent value="search" className="flex flex-col h-full m-0 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Find users</h3>
                <Shield className="h-3 w-3 text-green-500" title="Secure search" />
              </div>
              <Badge variant="outline" className="text-xs">
                {searchQuery.length >= 3 && !isSearchLoading ?
                  `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'}` :
                  'Search users'}
              </Badge>
            </div>
            
            <div className="relative flex gap-2 mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username (min 3 characters)..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Sanitize input - only allow alphanumeric and basic characters
                    const sanitizedValue = value.replace(/[^a-zA-Z0-9._-]/g, '');
                    setSearchQuery(sanitizedValue);

                    // Clear any existing timeout
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }

                    // Only trigger search if query is long enough
                    if (sanitizedValue.length >= 3) {
                      // Set a timeout to avoid too many requests
                      searchTimeoutRef.current = setTimeout(() => {
                        refetchSearch();
                      }, 500); // Increased debounce time
                    }
                  }}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Force refetch when Enter is pressed
                      if (searchQuery.length > 1) {
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        refetchSearch();
                      }
                    }
                  }}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 p-0 rounded-full opacity-70 hover:opacity-100"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (searchQuery.length > 1) {
                    // Clear any existing timeout
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    refetchSearch();
                  }
                }}
                disabled={isSearchLoading}
              >
                {isSearchLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <ScrollArea className="flex-grow">
              {searchQuery.length < 3 ? (
                <div className="text-center p-8">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Enter at least 3 characters to search</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search by username only for privacy protection
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Shield className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">Secure search</span>
                  </div>
                </div>
              ) : isSearchLoading ? (
                <div className="text-center p-8">
                  <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Searching users...</p>
                </div>
              ) : isSearchError ? (
                <div className="text-center p-8">
                  <p className="text-destructive">Error searching users</p>
                  <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refetchSearch()}
                    className="mt-4"
                  >
                    Try again
                  </Button>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a different username or email</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((user: any) => {
                    const isAlreadyContact = contacts.some((contact: Contact) => contact.id === user.id);
                    const isCurrentUser = user.id === currentUser?.id;

                    return (
                      <div key={user.id} className="group p-3 hover:bg-accent/50 border rounded-md transition-all duration-200 hover:shadow-sm">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={user.avatarUrl || ""} alt={user.username} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getInitials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-grow min-w-0">
                            <h4 className="font-medium text-foreground">{user.fullName || user.username}</h4>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                            {/* Removed email display for privacy */}
                          </div>
                          {isCurrentUser ? (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          ) : isAlreadyContact ? (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Contact
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddContact(user.id)}
                              disabled={addContactMutation.isPending}
                              className="ml-auto hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              {addContactMutation.isPending ? (
                                <Clock className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <UserPlus className="h-4 w-4 mr-2" />
                              )}
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
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