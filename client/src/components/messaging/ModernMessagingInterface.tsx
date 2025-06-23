import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';

// Import our new components
import { MessageBubble, type MessageData } from './MessageBubble';
import { ConversationHeader } from './ConversationHeader';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

// Use actual WebSocket context instead of fallback
function useSafeWebSocket() {
  return useWebSocket();
}

// Messaging feature has been disabled. The rest of the original implementation has been removed. A minimal stub is provided below to satisfy component imports.

export interface ModernMessagingInterfaceProps {
  /** The ID of the contact (unused) */
  contactId?: number;
  /** Optional class name */
  className?: string;
  /** Other props are ignored */
  [key: string]: any;
}

/**
 * Stub component shown when messaging is disabled.
 */
export function ModernMessagingInterface({ className }: ModernMessagingInterfaceProps) {
  return (
    <div
      className={
        className ? `${className} flex items-center justify-center text-muted-foreground` :
        "flex items-center justify-center text-muted-foreground"
      }
    >
      <p className="text-sm italic">Messaging is currently disabled.</p>
    </div>
  );
}

export default ModernMessagingInterface;
