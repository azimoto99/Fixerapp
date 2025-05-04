import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency, formatDate } from '@/lib/utils';
import { jsPDF } from 'jspdf';

interface DownloadReceiptProps {
  paymentId: number;
  isOpen: boolean;
  onClose: () => void;
}

const DownloadReceipt: React.FC<DownloadReceiptProps> = ({
  paymentId,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch payment details
  const { data: payment, isLoading } = useQuery({
    queryKey: ['/api/payments', paymentId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/${paymentId}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch payment details');
      }
      
      return res.json();
    },
    enabled: isOpen && !!paymentId,
  });

  // Fetch job details if this is a job payment
  const { data: job } = useQuery({
    queryKey: ['/api/jobs', payment?.jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs/${payment.jobId}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      return res.json();
    },
    enabled: isOpen && !!payment?.jobId,
  });

  const generateReceipt = async () => {
    if (!payment) return;
    
    setIsGenerating(true);
    try {
      // Create the PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set up the receipt template
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(33, 33, 33);
      
      // Add header
      doc.text('RECEIPT', 105, 20, { align: 'center' });
      
      // Add logo or branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129); // Green color
      doc.text('The Job', 105, 30, { align: 'center' });
      
      // Add divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 35, 190, 35);
      
      // Reset font for normal text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(33, 33, 33);
      
      // Payment details
      doc.text('Receipt Number:', 20, 50);
      doc.text(`#${payment.id}`, 80, 50);
      
      doc.text('Transaction ID:', 20, 60);
      doc.text(`${payment.transactionId || 'N/A'}`, 80, 60);
      
      doc.text('Date:', 20, 70);
      doc.text(`${payment.createdAt ? formatDate(new Date(payment.createdAt)) : 'N/A'}`, 80, 70);
      
      doc.text('Status:', 20, 80);
      doc.text(`${payment.status.toUpperCase()}`, 80, 80);
      
      // Add divider
      doc.line(20, 90, 190, 90);
      
      // Payment description
      if (job) {
        doc.text('Payment For:', 20, 100);
        doc.text(`Job: ${job.title}`, 80, 100);
      } else {
        doc.text('Description:', 20, 100);
        doc.text(`${payment.description || 'Payment'}`, 80, 100);
      }
      
      // Payment amount details
      doc.text('Payment Method:', 20, 110);
      doc.text(`${payment.paymentMethod || 'Credit Card'}`, 80, 110);
      
      doc.text('Amount:', 20, 120);
      doc.text(`${formatCurrency(payment.amount)}`, 80, 120);
      
      if (job) {
        doc.text('Service Fee:', 20, 130);
        doc.text(`${formatCurrency(job.serviceFee || 2.50)}`, 80, 130);
        
        doc.text('Total:', 20, 140);
        doc.setFont('helvetica', 'bold');
        doc.text(`${formatCurrency(job.totalAmount)}`, 80, 140);
        doc.setFont('helvetica', 'normal');
      }
      
      // Add footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for using The Job platform!', 105, 250, { align: 'center' });
      doc.text('This is an electronically generated receipt.', 105, 255, { align: 'center' });
      
      // Download the PDF
      const filename = `receipt-${payment.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      toast({
        title: 'Receipt Generated',
        description: 'Your receipt has been downloaded successfully!'
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: 'Error Generating Receipt',
        description: 'There was a problem generating your receipt. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payment ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">Receipt #:</div>
                  <div className="font-medium text-black">#{payment.id}</div>
                  
                  <div className="text-gray-600">Date:</div>
                  <div className="font-medium">
                    {payment.createdAt ? formatDate(new Date(payment.createdAt)) : 'N/A'}
                  </div>
                  
                  <div className="text-gray-600">Amount:</div>
                  <div className="font-medium text-green-600">{formatCurrency(payment.amount)}</div>
                  
                  <div className="text-gray-600">Status:</div>
                  <div className="font-medium capitalize">{payment.status}</div>
                  
                  {job && (
                    <>
                      <div className="text-gray-600">Job:</div>
                      <div className="font-medium">{job.title}</div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  onClick={generateReceipt}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Receipt
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-red-500">
              Failed to load payment details
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadReceipt;