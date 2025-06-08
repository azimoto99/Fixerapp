import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X } from 'lucide-react';

interface ProfileImageUploaderProps {
  user: User;
}

export function ProfileImageUploader({ user }: ProfileImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await apiRequest(
        'POST', 
        `/api/users/${user.id}/profile-image`, 
        { imageData }
      );
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the cache with new user data
      queryClient.setQueryData(['/api/user'], updatedUser);
      
      toast({
        title: 'Profile image updated',
        description: 'Your profile image has been successfully updated.',
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

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setPreviewImage(imageData);
      uploadImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = (imageData: string) => {
    setIsUploading(true);
    uploadMutation.mutate(imageData);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    // If there's no image to remove, just return
    if (!previewImage) return;
    
    // Set a default or placeholder image
    setIsUploading(true);
    uploadMutation.mutate('');
    setPreviewImage(null);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <Avatar className="h-24 w-24 cursor-pointer">
          <AvatarImage src={previewImage || undefined} alt={user.fullName} />
          <AvatarFallback className="text-2xl bg-primary text-white">
            {user.fullName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div 
          className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
        >
          <Upload className="text-white h-6 w-6" />
        </div>
        
        {previewImage && (
          <button 
            onClick={removeImage}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
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
      
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2"
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Change Image'}
      </Button>
    </div>
  );
}