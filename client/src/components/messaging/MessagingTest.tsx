import React from 'react';
import { MessageBubble, type MessageData } from './MessageBubble';
import { ConversationHeader } from './ConversationHeader';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ContactList, type Contact } from './ContactList';

// Test component to verify all messaging components work
export function MessagingTest() {
  const testMessage: MessageData = {
    id: 1,
    content: "Hello, this is a test message!",
    senderId: 1,
    recipientId: 2,
    isRead: true,
    createdAt: new Date(),
    status: 'read',
    senderName: 'John Doe',
    senderAvatar: '/avatar.jpg'
  };

  const testContacts: Contact[] = [
    {
      id: 1,
      name: 'John Doe',
      username: 'johndoe',
      avatar: '/avatar1.jpg',
      lastMessage: {
        content: 'Hey there!',
        timestamp: new Date(),
        isRead: false,
        senderId: 1
      },
      unreadCount: 2,
      isOnline: true,
      isPinned: false,
      isArchived: false,
      isTyping: false
    },
    {
      id: 2,
      name: 'Jane Smith',
      username: 'janesmith',
      avatar: '/avatar2.jpg',
      lastMessage: {
        content: 'How are you?',
        timestamp: new Date(Date.now() - 3600000),
        isRead: true,
        senderId: 2
      },
      unreadCount: 0,
      isOnline: false,
      isPinned: true,
      isArchived: false,
      isTyping: false
    }
  ];

  const typingUsers = [
    {
      id: 1,
      name: 'John Doe',
      avatar: '/avatar1.jpg'
    }
  ];

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold">Messaging Components Test</h2>
      
      {/* Test ConversationHeader */}
      <div className="border rounded-lg overflow-hidden">
        <ConversationHeader
          contactName="John Doe"
          contactUsername="johndoe"
          contactAvatar="/avatar.jpg"
          isOnline={true}
          isTyping={false}
          connectionStatus="connected"
          onBack={() => console.log('Back')}
          onCall={() => console.log('Call')}
          onVideoCall={() => console.log('Video call')}
        />
      </div>

      {/* Test MessageBubble */}
      <div className="space-y-2">
        <MessageBubble
          message={testMessage}
          isOwn={false}
          showAvatar={true}
          showTimestamp={true}
          onReply={(msg) => console.log('Reply to:', msg)}
          onReact={(id, emoji) => console.log('React:', id, emoji)}
        />
        
        <MessageBubble
          message={{...testMessage, id: 2, senderId: 2}}
          isOwn={true}
          showAvatar={true}
          showTimestamp={true}
          onReply={(msg) => console.log('Reply to:', msg)}
          onReact={(id, emoji) => console.log('React:', id, emoji)}
        />
      </div>

      {/* Test TypingIndicator */}
      <TypingIndicator users={typingUsers} />

      {/* Test MessageInput */}
      <MessageInput
        value=""
        onChange={(value) => console.log('Input change:', value)}
        onSend={(message, attachments) => console.log('Send:', message, attachments)}
        onTypingStart={() => console.log('Typing start')}
        onTypingStop={() => console.log('Typing stop')}
        placeholder="Type a message..."
      />

      {/* Test ContactList */}
      <div className="border rounded-lg h-64 overflow-hidden">
        <ContactList
          contacts={testContacts}
          selectedContactId={1}
          onContactSelect={(id) => console.log('Select contact:', id)}
          onContactCall={(id) => console.log('Call contact:', id)}
          onContactVideoCall={(id) => console.log('Video call contact:', id)}
          onContactPin={(id) => console.log('Pin contact:', id)}
          onContactArchive={(id) => console.log('Archive contact:', id)}
          onContactDelete={(id) => console.log('Delete contact:', id)}
        />
      </div>
    </div>
  );
}

export default MessagingTest;
