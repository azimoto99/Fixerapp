import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Users,
  Search,
  Send,
  UserPlus,
  Check,
  X,
  Loader2,
  User
} from 'lucide-react';
import { useLocation } from 'wouter';

interface MessagingDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MessagingDrawer: React.FC<MessagingDrawerProps> = ({ isOpen, onOpenChange }) => {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const [friendUsernameInput, setFriendUsernameInput] = useState('');
  
  // Fetch user's contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/contacts');
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!user,
  });
  
  // Fetch user's messages with selected contact
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['/api/messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const response = await apiRequest('GET', `/api/messages/${selectedUserId}`);
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !!selectedUserId && !!user,
  });
  
  // Search users mutation
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('GET', `/api/users/search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search users');
      }
      
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: error.message || 'Failed to search for users',
      });
    }
  });
  
  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest('POST', '/api/contacts/add', {
        username
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add contact');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Contact Added',
        description: 'User has been added to your contacts',
      });
      setFriendUsernameInput('');
      setShowAddFriendDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Contact',
        description: error.message || 'Could not add this user to your contacts',
      });
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !messageText.trim()) {
        throw new Error('Invalid message or recipient');
      }
      
      const response = await apiRequest('POST', '/api/messages/send', {
        recipientId: selectedUserId,
        content: messageText.trim()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessageText('');
      refetchMessages();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Message Failed',
        description: error.message || 'Could not send your message',
      });
    }
  });
  
  // Handle adding friend
  const handleAddFriend = () => {
    if (friendUsernameInput.trim()) {
      addFriendMutation.mutate(friendUsernameInput.trim());
    }
  };
  
  // Handle searching for users
  const handleSearchUsers = () => {
    if (searchQuery.trim()) {
      searchUsersMutation.mutate(searchQuery.trim());
    }
  };
  
  // Handle sending message
  const handleSendMessage = () => {
    if (messageText.trim() && selectedUserId) {
      sendMessageMutation.mutate();
    }
  };
  
  // Handle selecting a contact
  const handleSelectContact = (contactId: number) => {
    setSelectedUserId(contactId);
    setActiveTab('messages');
  };
  
  // Handle viewing a user profile
  const handleViewProfile = (userId: number) => {
    navigate(`/profile/${userId}`);
    onOpenChange(false);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>Messages & Contacts</SheetTitle>
          <SheetDescription>
            Connect and chat with other users
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="messages" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="messages">
              <MessageCircle className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="h-4 w-4 mr-2" />
              Contacts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages" className="p-0">
            <div className="flex flex-col h-[calc(100vh-9rem)]">
              {/* Contact selector */}
              <div className="border-b p-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Select Contact</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('contacts')}
                    className="h-8 px-2"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </div>
                
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {contacts.length > 0 ? (
                    contacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${selectedUserId === contact.id ? 'bg-muted' : ''}`}
                        onClick={() => handleSelectContact(contact.id)}
                      >
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={contact.profileImage} alt={contact.username} />
                          <AvatarFallback>{contact.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{contact.fullName || contact.username}</p>
                          {contact.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {contact.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3 text-sm text-muted-foreground">
                      No contacts yet. Add some friends!
                    </div>
                  )}
                </div>
              </div>
              
              {/* Message area */}
              <div className="flex-1 p-3 overflow-y-auto">
                {selectedUserId ? (
                  <div className="space-y-3">
                    {messages.length > 0 ? (
                      messages.map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              message.senderId === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(message.createdAt), 'h:mm a, MMM d')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        No messages yet. Start the conversation!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p>Select a contact to start messaging</p>
                  </div>
                )}
              </div>
              
              {/* Message input */}
              {selectedUserId && (
                <div className="p-3 border-t">
                  <div className="flex space-x-2">
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[60px] flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="self-end"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="contacts" className="p-3 relative">
            <div className="flex flex-col h-[calc(100vh-9rem)]">
              {/* Search bar */}
              <div className="flex space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchUsers();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleSearchUsers} disabled={!searchQuery.trim()}>
                  Search
                </Button>
              </div>
              
              {/* Add contact button */}
              <Button
                variant="outline"
                onClick={() => setShowAddFriendDialog(true)}
                className="mb-4"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
              
              {/* Search results */}
              {searchUsersMutation.isPending && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                </div>
              )}
              
              {searchUsersMutation.isSuccess && (
                <>
                  <p className="text-sm font-medium mb-2">Search Results</p>
                  <div className="space-y-2 mb-4 overflow-y-auto max-h-32">
                    {searchUsersMutation.data.length > 0 ? (
                      searchUsersMutation.data.map((user: any) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                        >
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={user.profileImage} alt={user.username} />
                              <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{user.fullName || user.username}</p>
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewProfile(user.id)}
                              className="h-8 px-2"
                            >
                              <User className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addFriendMutation.mutate(user.username)}
                              disabled={addFriendMutation.isPending}
                              className="h-8 px-2"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-3 text-sm text-muted-foreground">
                        No users found
                      </div>
                    )}
                  </div>
                  <Separator className="my-4" />
                </>
              )}
              
              {/* Contacts list */}
              <p className="text-sm font-medium mb-2">Your Contacts</p>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {contacts.length > 0 ? (
                  contacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={contact.profileImage} alt={contact.username} />
                          <AvatarFallback>{contact.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contact.fullName || contact.username}</p>
                          <p className="text-xs text-muted-foreground">@{contact.username}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProfile(contact.id)}
                          className="h-8 w-8 p-0"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectContact(contact.id)}
                          className="h-8 w-8 p-0"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No contacts yet. Add some friends!
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
      
      {/* Add friend dialog */}
      <Dialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Enter the username of the user you'd like to add as a contact.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              value={friendUsernameInput}
              onChange={(e) => setFriendUsernameInput(e.target.value)}
              placeholder="Username"
              className="mb-4"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFriendDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFriend} 
              disabled={!friendUsernameInput.trim() || addFriendMutation.isPending}
            >
              {addFriendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default MessagingDrawer;