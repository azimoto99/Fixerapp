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
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, X, Send, MessageSquare, UserPlus } from "lucide-react";

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("contacts");

  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
    enabled: open,
  });

  const { data: searchResults = [], isError: isSearchError } = useQuery({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      try {
        console.log(`Searching for users with query: ${searchQuery}`);
        const res = await apiRequest('GET', `/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) {
          console.error('Search API error:', await res.text());
          throw new Error('Failed to search users');
        }
        const data = await res.json();
        console.log('Search results:', data);
        return data;
      } catch (error) {
        console.error('Error in search query:', error);
        throw error;
      }
    },
    enabled: open && searchQuery.length > 1 && tab === "search",
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages', selectedContactId],
    enabled: open && selectedContactId !== null,
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
    mutationFn: (contactId: number) => 
      apiRequest('POST', '/api/contacts/add', { contactId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contact Added",
        description: "User has been added to your contacts",
      });
      setTab("contacts");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    }
  });

  const removeContactMutation = useMutation({
    mutationFn: (contactId: number) => 
      apiRequest('DELETE', `/api/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setSelectedContactId(null);
      toast({
        title: "Contact Removed",
        description: "User has been removed from your contacts",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove contact",
        variant: "destructive",
      });
    }
  });

  // Get current user
  useEffect(() => {
    if (open) {
      fetch('/api/user')
        .then(res => res.json())
        .then(data => {
          setCurrentUser(data);
        })
        .catch(err => {
          console.error('Failed to fetch user:', err);
        });
    }
  }, [open]);

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
    if (window.confirm("Are you sure you want to remove this contact?")) {
      removeContactMutation.mutate(contactId);
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
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Messages</SheetTitle>
          <SheetDescription>Contact and chat with other users</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-grow h-full">
          <TabsList className="grid grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="search">Find Users</TabsTrigger>
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
                        className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.senderId === user?.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderId === user?.id 
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
                <p className="text-sm text-muted-foreground mb-2">Your contacts</p>
                <div className="space-y-2">
                  {contacts.length === 0 ? (
                    <div className="text-center p-4">
                      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No contacts yet</p>
                      <p className="text-sm text-muted-foreground">
                        Use the Find Users tab to add contacts
                      </p>
                    </div>
                  ) : (
                    contacts.map((contact: Contact) => (
                      <Card 
                        key={contact.id} 
                        className="p-3 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleContactSelect(contact.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={contact.avatarUrl || ""} alt={contact.username} />
                            <AvatarFallback>{getInitials(contact.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-grow min-w-0">
                            <h4 className="font-medium">{contact.fullName || contact.username}</h4>
                            <p className="text-sm text-muted-foreground truncate">{contact.lastMessage || 'No messages yet'}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveContact(contact.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="flex flex-col h-full m-0 p-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Force refetch when Enter is pressed
                    if (searchQuery.length > 1) {
                      queryClient.invalidateQueries({ queryKey: ['/api/users/search', searchQuery] });
                    }
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (searchQuery.length > 1) {
                    queryClient.invalidateQueries({ queryKey: ['/api/users/search', searchQuery] });
                  }
                }}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {searchQuery.length <= 1 ? (
                <div className="text-center p-8">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Enter a username or email to search</p>
                  <p className="text-xs text-muted-foreground mt-1">Press Enter or click the search icon to search</p>
                </div>
              ) : isSearchError ? (
                <div className="text-center p-8">
                  <p className="text-destructive">Error searching users</p>
                  <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a different username or email</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  {searchResults.map((user: any, index: number) => (
                    <div key={user.id} className="p-3 hover:bg-accent/50 transition-colors">
                      {index > 0 && <Separator className="mb-3" />}
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatarUrl || user.profileImage || ""} alt={user.username} />
                          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <h4 className="font-medium">{user.fullName || user.username}</h4>
                          <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                            {user.email && (
                              <>
                                <span className="hidden xs:inline text-muted-foreground">•</span>
                                <p className="text-sm text-muted-foreground truncate max-w-[150px]">{user.email}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddContact(user.id)}
                          className="ml-auto"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}