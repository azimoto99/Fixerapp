
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";

interface PaymentReceiptProps {
  payment: {
    id: number;
    amount: number;
    createdAt: string;
    status: string;
    description: string;
    transactionId: string;
    jobId?: number;
    jobTitle?: string;
  };
}

export default function PaymentReceipt({ payment }: PaymentReceiptProps) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { toast } = useToast();
  
  const copyReceiptToClipboard = async () => {
    try {
      const receiptText = `
Payment Receipt
--------------
Transaction ID: ${payment.transactionId}
Amount: $${payment.amount.toFixed(2)}
Date: ${formatDate(payment.createdAt)}
Status: ${payment.status}
Description: ${payment.description}
${payment.jobTitle ? `Job: ${payment.jobTitle}` : ''}
    `.trim();

    await navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Success",
      description: "Receipt copied to clipboard",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to copy receipt to clipboard",
      variant: "destructive"
    });
  }
  };

  const downloadReceipt = () => {
    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Payment Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .receipt { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; }
    .details { margin: 20px 0; }
    .row { display: flex; justify-content: space-between; margin: 10px 0; }
    .footer { margin-top: 40px; text-align: center; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Payment Receipt</h1>
      <p>Transaction ID: ${payment.transactionId}</p>
    </div>
    <div class="details">
      <div class="row">
        <span>Amount:</span>
        <span>$${payment.amount.toFixed(2)}</span>
      </div>
      <div class="row">
        <span>Date:</span>
        <span>${formatDate(payment.createdAt)}</span>
      </div>
      <div class="row">
        <span>Status:</span>
        <span>${payment.status}</span>
      </div>
      <div class="row">
        <span>Description:</span>
        <span>${payment.description}</span>
      </div>
      ${payment.jobTitle ? `
      <div class="row">
        <span>Job:</span>
        <span>${payment.jobTitle}</span>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>Thank you for your payment!</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${payment.transactionId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Receipt</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Transaction ID:</span>
            <span className="font-medium">{payment.transactionId}</span>
            
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">${payment.amount.toFixed(2)}</span>
            
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(payment.createdAt)}</span>
            
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">{payment.status}</span>
            
            <span className="text-muted-foreground">Description:</span>
            <span className="font-medium">{payment.description}</span>
            
            {payment.jobTitle && (
              <>
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">{payment.jobTitle}</span>
              </>
            )}
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={copyReceiptToClipboard}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={downloadReceipt}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
