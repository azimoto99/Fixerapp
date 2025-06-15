import { useState, useRef } from 'react';
import { Camera, Upload, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadProfileImage, validateImageFile, resizeImage } from '@/lib/uploadService';
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
      toast({
        title: "Avatar Updated! 🎉",
        description: "Your profile picture has been uploaded to secure cloud storage.",
      });

      // Update local preview with the new S3 URL
      setPreviewUrl(result.url);

      // Notify parent component
      onAvatarUpdate?.(result.url);

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
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (file: File) => {
    try {
      // Validate file using our new validation function
      validateImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      uploadMutation.mutate(file);
    } catch (error) {
      toast({
        title: "Invalid File",
        description: error instanceof Error ? error.message : "Please select a valid image file.",
        variant: "destructive",
      });
    }
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