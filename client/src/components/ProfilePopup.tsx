import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface ProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
}

export function ProfilePopup({ open, onOpenChange, userId }: ProfilePopupProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await apiRequest('GET', `/api/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    enabled: open && !!userId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {isLoading || !user ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback>{user.fullName?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{user.fullName || user.username}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {user.bio && <p>{user.bio}</p>}
              {user.rating && (
                <p className="text-sm text-muted-foreground">Average rating: {user.rating.toFixed(1)} ⭐</p>
              )}
              {user.location && (
                <p className="text-sm text-muted-foreground">Location: {user.location}</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProfilePopup; 