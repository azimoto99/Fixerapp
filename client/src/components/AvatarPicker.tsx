import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Define available avatars
// These will be served from /public/avatars/
export const PREDEFINED_AVATARS = [
  'avatar-1.png',
  'avatar-2.png',
  'avatar-3.png',
  'avatar-4.png',
  'avatar-5.png',
  'avatar-6.png',
  'avatar-7.png',
  'avatar-8.png',
] as const;

interface AvatarPickerProps {
  currentAvatarUrl?: string;
  userId: number;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
  className?: string;
}

export function AvatarPicker({ currentAvatarUrl, userId, onAvatarUpdate, className = "" }: AvatarPickerProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (avatarName: string) => {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update avatar');
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Avatar Updated! 🎉",
        description: "Your profile picture has been updated.",
      });

      // Notify parent component
      if (result.avatarUrl) {
        onAvatarUpdate?.(result.avatarUrl);
      }

      // Update the user cache if user data is returned
      if (result.user) {
        queryClient.setQueryData(['/api/user'], result.user);
      }

      // Invalidate user queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAvatarSelect = (avatarName: string) => {
    setSelectedAvatar(avatarName);
  };

  const handleUpdateAvatar = () => {
    if (selectedAvatar) {
      updateMutation.mutate(selectedAvatar);
    }
  };

  // Get the current avatar name from URL if it exists
  const getCurrentAvatarName = () => {
    if (!currentAvatarUrl) return null;
    return PREDEFINED_AVATARS.find(avatar => currentAvatarUrl.includes(avatar)) || null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-4 gap-4">
        {PREDEFINED_AVATARS.map((avatar) => {
          const isSelected = avatar === selectedAvatar;
          const isCurrent = avatar === getCurrentAvatarName();
          
          return (
            <button
              key={avatar}
              onClick={() => handleAvatarSelect(avatar)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
                ${isCurrent ? 'border-primary/50' : ''}
              `}
            >
              <img 
                src={`/avatars/${avatar}`} 
                alt={`Avatar option ${avatar}`}
                className="w-full h-full object-cover"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleUpdateAvatar}
          disabled={!selectedAvatar || updateMutation.isPending}
        >
          {updateMutation.isPending ? "Updating..." : "Update Avatar"}
        </Button>
      </div>
    </div>
  );
} 