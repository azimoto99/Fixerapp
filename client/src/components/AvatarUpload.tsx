import { useState, useRef } from 'react';
import { Camera, Upload, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  userId: number;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
  className?: string;
}

export function AvatarUpload({ currentAvatarUrl, userId, onAvatarUpdate, className = "" }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Convert file to base64 data URL to match the expected format
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const response = await apiRequest(
        'POST',
        `/api/users/${userId}/profile-image`,
        { imageData }
      );
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Avatar Updated! 🎉",
        description: "Your profile picture has been updated successfully.",
      });
      
      // Update local preview with the new avatar URL
      setPreviewUrl(updatedUser.avatarUrl);
      
      // Notify parent component
      onAvatarUpdate?.(updatedUser.avatarUrl);
      
      // Update the user cache
      queryClient.setQueryData(['/api/user'], updatedUser);
      
      // Invalidate user queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPG or PNG image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadMutation.mutate(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    setPreviewUrl(null);
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Avatar Display & Upload Area */}
      <div
        className={`relative group cursor-pointer transition-all duration-200 ${
          isDragging ? 'scale-105 ring-2 ring-blue-500' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
      >
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-white shadow-lg">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <User size={32} />
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
            <Camera className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" size={20} />
          </div>
          
          {/* Loading Spinner */}
          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Preview Clear Button */}
        {previewUrl && !uploadMutation.isPending && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearPreview();
            }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Upload Instructions */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          Click or drag an image to upload
        </p>
        <p className="text-xs text-gray-400">
          JPG or PNG, max 2MB
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-2"
        >
          <Upload size={16} />
          Choose File
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}