import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X } from 'lucide-react';
import { uploadProfileImage, validateImageFile, resizeImage } from '@/lib/uploadService';

// Predefined avatars list (should match server-side PREDEFINED_AVATARS)
const PREDEFINED_AVATARS = [
  'avatar-1.png',
  'avatar-2.png',
  'avatar-3.png',
  'avatar-4.png',
  'avatar-5.png',
  'avatar-6.png',
  'avatar-7.png',
  'avatar-8.png',
];

interface ProfileImageUploaderProps {
  user: User;
}

export function ProfileImageUploader({ user }: ProfileImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate the image file
      validateImageFile(file);

      // Resize image if it's too large (optional optimization)
      let processedFile = file;
      if (file.size > 1024 * 1024) { // If larger than 1MB, resize
        processedFile = await resizeImage(file, 400, 400, 0.8);
      }

      // Upload to S3 via our new service
      const result = await uploadProfileImage(processedFile);
      return result;
    },
    onSuccess: (result) => {
      // Update the cache with new user data if available
      if (result.user) {
        queryClient.setQueryData(['/api/user'], result.user);
      }

      toast({
        title: 'Profile image updated',
        description: 'Your profile image has been uploaded to secure cloud storage.',
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

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarName: string) => {
      const response = await apiRequest('POST', '/api/user/avatar', { avatarName });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/user'], data.user);
      setPreviewImage(data.avatarUrl);
      toast({
        title: 'Avatar updated',
        description: 'Your profile avatar has been updated successfully.',
      });
      setIsUploading(false);
      setShowAvatarSelector(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file using our new validation function
      validateImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setPreviewImage(imageData);
      };
      reader.readAsDataURL(file);

      // Upload file
      setIsUploading(true);
      uploadMutation.mutate(file);
    } catch (error) {
      toast({
        title: 'Invalid file',
        description: error instanceof Error ? error.message : 'Please select a valid image file.',
        variant: 'destructive',
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = async () => {
    // If there's no image to remove, just return
    if (!previewImage) return;

    try {
      // Create a 1x1 transparent pixel as a placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx!.clearRect(0, 0, 1, 1);

      // Convert to blob and then to file
      canvas.toBlob((blob) => {
        if (blob) {
          const placeholderFile = new File([blob], 'placeholder.png', { type: 'image/png' });
          setIsUploading(true);
          uploadMutation.mutate(placeholderFile);
          setPreviewImage(null);
        }
      }, 'image/png');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove image',
        variant: 'destructive',
      });
    }
  };

  const selectAvatar = (avatarName: string) => {
    setIsUploading(true);
    updateAvatarMutation.mutate(avatarName);
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
      
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2"
        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
        disabled={isUploading}
      >
        {showAvatarSelector ? 'Hide Avatars' : 'Select Avatar'}
      </Button>
      
      {showAvatarSelector && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {PREDEFINED_AVATARS.map((avatarName) => (
            <button
              key={avatarName}
              className="relative group/avatar"
              onClick={() => selectAvatar(avatarName)}
              disabled={isUploading}
            >
              <Avatar className="h-16 w-16 cursor-pointer border-2 border-background">
                <AvatarImage src={`/avatars/${avatarName}`} alt={`Avatar ${avatarName}`} />
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                <span className="text-white text-sm">Select</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}