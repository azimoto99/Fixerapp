import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  X,
  Image,
  File,
  Camera,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, attachments?: File[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  allowAttachments?: boolean;
  allowEmojis?: boolean;
  allowVoiceMessages?: boolean;
  replyTo?: { id: number; content: string; senderName: string } | null;
  onCancelReply?: () => void;
  className?: string;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'
];

export function MessageInput({
  value,
  onChange,
  onSend,
  onTypingStart,
  onTypingStop,
  placeholder = "Type a message...",
  disabled = false,
  isLoading = false,
  maxLength = 1000,
  allowAttachments = true,
  allowEmojis = true,
  allowVoiceMessages = false,
  replyTo,
  onCancelReply,
  className
}: MessageInputProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Handle typing indicators
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    
    // Start typing indicator
    if (newValue.length > 0 && !typingTimeoutRef.current) {
      onTypingStart?.();
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop?.();
      typingTimeoutRef.current = undefined;
    }, 2000);
  };

  // Handle send message
  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || disabled || isLoading) return;
    
    onSend(value.trim(), attachments.length > 0 ? attachments : undefined);
    onChange('');
    setAttachments([]);
    onTypingStop?.();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    }
  };

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled && !isLoading;

  return (
    <div className={cn("border-t bg-background/95 backdrop-blur-xl", className)}>
      {/* Reply Context */}
      {replyTo && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary">
                Replying to {replyTo.senderName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {replyTo.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelReply}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
              >
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate max-w-32">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  className="h-4 w-4 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex items-end gap-2 p-4">
        {/* Attachment Button */}
        {allowAttachments && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-accent shrink-0"
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <File className="h-4 w-4 mr-2" />
                Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Image className="h-4 w-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none rounded-2xl border-0 bg-muted/50",
              "focus-visible:ring-1 focus-visible:ring-ring pr-12",
              "placeholder:text-muted-foreground"
            )}
            rows={1}
          />
          
          {/* Character Count */}
          {maxLength && value.length > maxLength * 0.8 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {value.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Emoji Button */}
        {allowEmojis && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-accent shrink-0"
                disabled={disabled}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end" side="top">
              <div className="grid grid-cols-10 gap-1">
                {EMOJI_LIST.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => insertEmoji(emoji)}
                    className="p-2 hover:bg-accent rounded text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Send/Voice Button */}
        {canSend ? (
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        ) : allowVoiceMessages ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full shrink-0",
              isRecording && "bg-red-500 text-white hover:bg-red-600"
            )}
            disabled={disabled}
          >
            <Mic className="h-4 w-4" />
          </Button>
        ) : null}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
}

export default MessageInput;
