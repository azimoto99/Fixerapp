import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExternalLink, FileText, AlertCircle, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PaymentDetailsCardProps {
  payment: any;
  onViewReceipt?: () => void;
  onRefund?: () => void;
  showJobDetails?: boolean;
  showActions?: boolean;
}

const PaymentDetailsCard: React.FC<PaymentDetailsCardProps> = ({
  payment,
  onViewReceipt,
  onRefund,
  showJobDetails = true,
  showActions = true,
}) => {
  if (!payment) return null;

  // Status icon based on payment status
  const getStatusIcon = () => {
    switch (payment.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'processing':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Get variant for status badge
  const getStatusVariant = () => {
    switch (payment.status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'processing':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="overflow-hidden border">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{payment.description || 'Payment'}</CardTitle>
          <Badge className="flex items-center gap-1" variant={getStatusVariant() as any}>
            {getStatusIcon()}
            <span className="capitalize">{payment.status}</span>
          </Badge>
        </div>
        <CardDescription>
          {formatDate(payment.createdAt)}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4">
          {/* Payment amount */}
          <div className="text-center py-4 bg-muted/40 rounded-md">
            <span className="text-3xl font-bold">
              {formatCurrency(payment.amount)}
            </span>
          </div>
          
          {/* Payment details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="font-medium">Payment ID:</div>
            <div className="text-muted-foreground truncate">{payment.id}</div>
            
            {payment.transactionId && (
              <>
                <div className="font-medium">Transaction ID:</div>
                <div className="text-muted-foreground truncate">{payment.transactionId}</div>
              </>
            )}
            
            <div className="font-medium">Payment Type:</div>
            <div className="capitalize">{payment.type?.replace(/_/g, ' ') || 'Standard Payment'}</div>
            
            <div className="font-medium">Payment Method:</div>
            <div className="capitalize">{payment.paymentMethod || 'Credit Card'}</div>
            
            {showJobDetails && payment.jobId && (
              <>
                <div className="font-medium">Job Reference:</div>
                <div className="text-muted-foreground">Job #{payment.jobId}</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
      
      {showActions && (
        <CardFooter className="flex flex-wrap gap-2 pt-2">
          {onViewReceipt && (
            <Button variant="outline" size="sm" onClick={onViewReceipt} className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              View Receipt
            </Button>
          )}
          
          {onRefund && payment.status === 'completed' && (
            <Button variant="outline" size="sm" onClick={onRefund} className="flex-1 text-red-500 hover:text-red-600">
              <XCircle className="h-4 w-4 mr-2" />
              Request Refund
            </Button>
          )}
          
          {payment.transactionId && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(`https://dashboard.stripe.com/payments/${payment.transactionId}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Stripe
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default PaymentDetailsCard;