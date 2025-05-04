import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Payment } from '@shared/schema';

interface DownloadReceiptProps {
  paymentId: number;
  isOpen: boolean;
  onClose: () => void;
}

const DownloadReceipt: React.FC<DownloadReceiptProps> = ({ paymentId, isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch the specific payment details
  const { data: payment, isLoading } = useQuery({
    queryKey: ['/api/payments', paymentId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/${paymentId}`);
      return res.json();
    },
    enabled: isOpen && !!paymentId,
  });

  const generateReceipt = async () => {
    if (!payment) return;
    
    setIsGenerating(true);
    
    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set title
      doc.setFontSize(20);
      doc.text("Payment Receipt", 105, 20, { align: 'center' });
      
      // Add logo/branding
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("The Job", 105, 30, { align: 'center' });
      doc.text("Your Local Gig Work Platform", 105, 35, { align: 'center' });
      
      // Add receipt details
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      const startY = 50;
      const lineHeight = 7;
      let currentY = startY;
      
      // Receipt header
      doc.setFont('helvetica', 'bold');
      doc.text("Receipt #:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`TJ-${payment.id.toString().padStart(5, '0')}`, 60, currentY);
      currentY += lineHeight;
      
      doc.setFont('helvetica', 'bold');
      doc.text("Date:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(payment.createdAt || new Date()), 60, currentY);
      currentY += lineHeight * 2;
      
      // Payment details
      doc.setFont('helvetica', 'bold');
      doc.text("Payment Details", 20, currentY);
      currentY += lineHeight;
      
      doc.setFont('helvetica', 'normal');
      doc.text("Description:", 20, currentY);
      doc.text(payment.description || "Payment for services", 60, currentY);
      currentY += lineHeight;
      
      doc.text("Amount:", 20, currentY);
      doc.text(formatCurrency(payment.amount), 60, currentY);
      currentY += lineHeight;
      
      doc.text("Status:", 20, currentY);
      doc.text(payment.status.toUpperCase(), 60, currentY);
      currentY += lineHeight;
      
      doc.text("Transaction ID:", 20, currentY);
      doc.text(payment.transactionId || "N/A", 60, currentY);
      currentY += lineHeight;
      
      doc.text("Payment Method:", 20, currentY);
      doc.text(payment.paymentMethod || "Credit Card", 60, currentY);
      currentY += lineHeight * 2;
      
      // Footer
      const footerY = 270;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Thank you for using The Job!", 105, footerY - 10, { align: 'center' });
      doc.text("This is an official receipt for your payment.", 105, footerY - 5, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString()}`, 105, footerY, { align: 'center' });
      
      // Save the PDF
      doc.save(`Receipt-TJ${payment.id.toString().padStart(5, '0')}.pdf`);
    } catch (error) {
      console.error("Error generating receipt:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !payment ? (
          <div className="text-center py-6 text-red-500">
            Unable to load payment details
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">Receipt #:</div>
              <div className="font-medium">TJ-{payment.id.toString().padStart(5, '0')}</div>
              
              <div className="text-gray-500">Date:</div>
              <div>{formatDate(payment.createdAt || new Date())}</div>
              
              <div className="text-gray-500">Description:</div>
              <div>{payment.description || "Payment for services"}</div>
              
              <div className="text-gray-500">Status:</div>
              <div className="font-medium text-green-600">{payment.status.toUpperCase()}</div>
              
              <div className="text-gray-500">Amount:</div>
              <div className="font-bold">{formatCurrency(payment.amount)}</div>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={generateReceipt}
            disabled={isLoading || isGenerating || !payment}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Download Receipt'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadReceipt;