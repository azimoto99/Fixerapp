import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TicketAttachmentsProps {
  ticketId?: number;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    uploadedAt: string;
    url?: string;
  }>;
  onAttachmentUpload?: (file: File) => Promise<void>;
  onAttachmentRemove?: (attachmentId: string) => Promise<void>;
  readonly?: boolean;
}

export function TicketAttachments({
  ticketId,
  attachments = [],
  onAttachmentUpload,
  onAttachmentRemove,
  readonly = false
}: TicketAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onAttachmentUpload) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload images, PDFs, or text documents only",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await onAttachmentUpload(file);
      toast({
        title: "File uploaded",
        description: "Your attachment has been uploaded successfully",
      });
      // Reset the input
      event.target.value = '';
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!onAttachmentRemove) return;

    try {
      await onAttachmentRemove(attachmentId);
      toast({
        title: "Attachment removed",
        description: "The attachment has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Removal failed",
        description: "Failed to remove the attachment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {!readonly && (
        <div className="space-y-2">
          <Label htmlFor="attachment-upload">Add Attachment</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="attachment-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx"
              className="flex-1"
            />
            <Button type="button" disabled={uploading} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Supported formats: Images, PDFs, text documents. Max size: 10MB
          </p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label>Attachments ({attachments.length})</Label>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.filename}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(attachment.size)}</span>
                          <span>•</span>
                          <span>
                            {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attachment.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(attachment.url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {!readonly && onAttachmentRemove && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}