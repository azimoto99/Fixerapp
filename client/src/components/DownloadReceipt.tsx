import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2, Receipt, Download, CreditCard, Calendar, DollarSign, Check, Clock } from 'lucide-react';
import { Payment, Job } from '@shared/schema';

interface DownloadReceiptProps {
  paymentId: number;
  isOpen: boolean;
  onClose: () => void;
}

const DownloadReceipt: React.FC<DownloadReceiptProps> = ({ paymentId, isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch the specific payment details
  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ['/api/payments', paymentId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payments/${paymentId}`);
      return res.json();
    },
    enabled: isOpen && !!paymentId,
  });

  // Fetch job details if this payment is related to a job
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['/api/jobs', payment?.jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs/${payment.jobId}`);
      return res.json();
    },
    enabled: isOpen && !!payment?.jobId,
  });

  const isLoading = paymentLoading || (payment?.jobId && jobLoading);

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
      
      // Add emerald green color header
      doc.setFillColor(16, 185, 129); // Emerald-500 color
      doc.rect(0, 0, 210, 40, 'F');
      
      // Set title with white text
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("PAYMENT RECEIPT", 105, 20, { align: 'center' });
      
      // Add logo/branding
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Fixer", 105, 30, { align: 'center' });
      doc.text("Your Local Gig Work Platform", 105, 35, { align: 'center' });
      
      // Add receipt details
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      const startY = 50;
      const lineHeight = 7;
      let currentY = startY;
      
      // Receipt header
      doc.setFont('helvetica', 'bold');
      doc.text("Receipt Number:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`FXR-${payment.id.toString().padStart(5, '0')}`, 70, currentY);
      currentY += lineHeight;
      
      doc.setFont('helvetica', 'bold');
      doc.text("Date:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(payment.createdAt || new Date()), 70, currentY);
      currentY += lineHeight;
      
      doc.setFont('helvetica', 'bold');
      doc.text("Status:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      if (payment.status === 'completed') {
        doc.setTextColor(16, 185, 129); // Emerald green for completed
      }
      doc.text(payment.status.toUpperCase(), 70, currentY);
      doc.setTextColor(0, 0, 0); // Reset text color
      currentY += lineHeight * 2;
      
      // Horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY - 3, 190, currentY - 3);
      
      // Payment details section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("Payment Details", 20, currentY);
      currentY += lineHeight + 2;
      doc.setFontSize(12);
      
      doc.setFont('helvetica', 'normal');
      doc.text("Description:", 20, currentY);
      doc.text(payment.description || "Payment for services", 70, currentY);
      currentY += lineHeight;
      
      if (job) {
        doc.text("Job Title:", 20, currentY);
        doc.text(job.title || "Not specified", 70, currentY);
        currentY += lineHeight;
        
        if (job.location) {
          doc.text("Location:", 20, currentY);
          doc.text(job.location, 70, currentY);
          currentY += lineHeight;
        }
      }
      
      doc.text("Transaction ID:", 20, currentY);
      doc.text(payment.transactionId || "N/A", 70, currentY);
      currentY += lineHeight;
      
      doc.text("Payment Method:", 20, currentY);
      doc.text(payment.paymentMethod || "Credit Card", 70, currentY);
      currentY += lineHeight * 2;
      
      // Horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY - 3, 190, currentY - 3);
      
      // Amount section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("Amount", 20, currentY);
      currentY += lineHeight + 2;
      doc.setFontSize(12);
      
      // If job payment, show subtotal, fee, and total
      if (job) {
        const serviceFee = job.serviceFee || (job.paymentAmount * 0.05); // 5% service fee
        const subtotal = payment.amount - serviceFee;
        
        doc.setFont('helvetica', 'normal');
        doc.text("Payment Amount:", 20, currentY);
        doc.text(formatCurrency(subtotal), 150, currentY, { align: 'right' });
        currentY += lineHeight;
        
        doc.text("Service Fee:", 20, currentY);
        doc.text(formatCurrency(serviceFee), 150, currentY, { align: 'right' });
        currentY += lineHeight;
        
        // Line for total
        doc.setDrawColor(200, 200, 200);
        doc.line(100, currentY, 150, currentY);
        currentY += lineHeight;
        
        doc.setFont('helvetica', 'bold');
        doc.text("Total:", 20, currentY);
        doc.text(formatCurrency(payment.amount), 150, currentY, { align: 'right' });
      } else {
        // Simple payment without fee breakdown
        doc.setFont('helvetica', 'bold');
        doc.text("Total Amount:", 20, currentY);
        doc.text(formatCurrency(payment.amount), 150, currentY, { align: 'right' });
      }
      
      currentY += lineHeight * 3;
      
      // Add a note about the receipt
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("This receipt is proof of payment for services rendered through Fixer platform.", 105, currentY, { align: 'center' });
      currentY += lineHeight;
      
      // Footer with bottom border
      const footerY = 270;
      doc.setFillColor(16, 185, 129, 0.1); // Light emerald background
      doc.rect(0, footerY - 20, 210, 30, 'F');
      
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(0, footerY - 20, 210, footerY - 20);
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.text("Thank you for using Fixer!", 105, footerY - 12, { align: 'center' });
      doc.text("This is an official receipt for your payment.", 105, footerY - 7, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString()}`, 105, footerY - 2, { align: 'center' });
      
      // Save the PDF
      doc.save(`Receipt-FXR${payment.id.toString().padStart(5, '0')}.pdf`);
    } catch (error) {
      console.error("Error generating receipt:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to format status with appropriate icon and color
  const renderStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center text-emerald-600">
            <Check className="h-4 w-4 mr-1" />
            <span className="font-medium uppercase">Completed</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center text-yellow-600">
            <Clock className="h-4 w-4 mr-1" />
            <span className="font-medium uppercase">Pending</span>
          </div>
        );
      default:
        return (
          <div className="font-medium uppercase">{status}</div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2 text-emerald-500" />
            Payment Receipt
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : !payment ? (
          <div className="text-center py-6 text-red-500">
            Unable to load payment details
          </div>
        ) : (
          <div className="py-4">
            <Card className="border-emerald-100 bg-emerald-50">
              <CardContent className="pt-6 pb-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800">
                      Receipt #{payment.id.toString().padStart(5, '0')}
                    </h3>
                    <div className="flex items-center text-sm text-emerald-600 mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {formatDate(payment.createdAt || new Date())}
                    </div>
                  </div>
                  <div className="text-right">
                    {renderStatus(payment.status)}
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Description</div>
                    <div className="font-medium">{payment.description || "Payment for services"}</div>
                  </div>
                  
                  {job && (
                    <div>
                      <div className="text-sm text-gray-500">Job</div>
                      <div className="font-medium">{job.title}</div>
                    </div>
                  )}
                  
                  {payment.transactionId && (
                    <div>
                      <div className="text-sm text-gray-500">Transaction ID</div>
                      <div className="font-medium text-xs font-mono">{payment.transactionId}</div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-sm text-gray-500">Payment Method</div>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="font-medium">{payment.paymentMethod || "Credit Card"}</span>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-500">Total Amount</div>
                  <div className="flex items-center text-xl font-bold text-emerald-700">
                    <DollarSign className="h-5 w-5 mr-1" />
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
                
                {job && job.serviceFee && (
                  <div className="text-xs text-gray-500 text-right mt-1">
                    Includes service fee of {formatCurrency(job.serviceFee)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={generateReceipt}
            disabled={isLoading || isGenerating || !payment}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadReceipt;