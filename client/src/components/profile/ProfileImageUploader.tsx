import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Camera } from 'lucide-react';

interface ProfileImageUploaderProps {
  user: User;
  className?: string;
  compact?: boolean; // New prop for compact mode
}

export function ProfileImageUploader({ user, className = "", compact = false }: ProfileImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      }
      
      if (file.size > maxSize) {
        throw new Error('Image must be smaller than 5MB');
      }

      // Create form data
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload the file - don't set Content-Type header, let browser set it for FormData
      const response = await apiRequest('POST', '/api/user/avatar/upload', formData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }
      return response.json();
    },
    onSuccess: (result) => {
      // Update the preview and cache
      if (result.avatarUrl) {
        setPreviewImage(result.avatarUrl);
      }

      // Update the user cache
      queryClient.setQueryData(['/api/user'], (oldData: any) => {
        if (oldData) {
          return { ...oldData, avatarUrl: result.avatarUrl };
        }
        return oldData;
      });

      // Invalidate user queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });

      toast({
        title: 'Profile image updated! 🎉',
        description: 'Your profile image has been uploaded successfully.',
      });

      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      
      setIsUploading(false);
      // Reset preview to original on error
      setPreviewImage(user.avatarUrl);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    uploadMutation.mutate(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = async () => {
    if (!previewImage) return;

    try {
      setIsUploading(true);
      const response = await apiRequest('DELETE', '/api/user/avatar');
      
      if (!response.ok) {
        throw new Error('Failed to remove image');
      }

      setPreviewImage(null);
      
      // Update cache
      queryClient.setQueryData(['/api/user'], (oldData: any) => {
        if (oldData) {
          return { ...oldData, avatarUrl: null };
        }
        return oldData;
      });

      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });

      toast({
        title: 'Profile image removed',
        description: 'Your profile image has been removed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center ${compact ? 'space-y-2' : 'space-y-4'} ${className}`}>
      <div className="relative group">
        <Avatar className={`${compact ? 'h-16 w-16' : 'h-24 w-24'} cursor-pointer border-2 border-border`}>
          <AvatarImage src={previewImage || undefined} alt={user.fullName || user.username} />
          <AvatarFallback className={`${compact ? 'text-lg' : 'text-2xl'} bg-primary/10 text-primary`}>
            {(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div 
          className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
        >
          <Camera className={`text-white ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        </div>
        
        {previewImage && (
          <button 
            onClick={removeImage}
            disabled={isUploading}
            className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors disabled:opacity-50"
            aria-label="Remove image"
          >
            <X className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
          </button>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!compact && (
        <div className="text-center space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerFileInput}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Upload a profile picture to help others recognize you
            </p>
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, at least 200x200 pixels, max 5MB
            </p>
          </div>
        </div>
      )}
      
      {compact && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Click image to change
          </p>
        </div>
      )}
    </div>
  );
}