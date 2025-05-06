import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Search, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StripeConnectSetup from '@/components/stripe/StripeConnectSetup';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentsContentProps {
  userId: number;
}

const PaymentsContent: React.FC<PaymentsContentProps> = ({ userId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch payments from the API
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/payments/user', userId],
    queryFn: async () => {
      const res = await fetch(`/api/payments/user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
  });

  // Filter payments based on search term and status
  const filteredPayments = payments
    ? payments.filter((payment: any) => {
        const matchesSearch =
          searchTerm === '' ||
          payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.amount.toString().includes(searchTerm);
          
        const matchesStatus = 
          statusFilter === 'all' || 
          payment.status.toLowerCase() === statusFilter.toLowerCase();
          
        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="setup">Payment Setup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Your Payments</CardTitle>
              <CardDescription>
                {user?.accountType === 'worker' 
                  ? 'Track payments you\'ve received for completed jobs' 
                  : 'View your payment history for jobs you\'ve posted'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-4">
                  {/* Search and filter controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search payments..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payments table */}
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length > 0 ? (
                          filteredPayments.map((payment: any) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                {formatDate(payment.createdAt)}
                              </TableCell>
                              <TableCell>{payment.description}</TableCell>
                              <TableCell>{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    payment.status === 'completed' ? 'green' :
                                    payment.status === 'pending' ? 'outline' :
                                    payment.status === 'processing' ? 'secondary' :
                                    'destructive'
                                  }
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              No matching payments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : isLoadingPayments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <p className="text-muted-foreground">No payment history found</p>
                  {user?.accountType === 'worker' && (
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('setup')}
                    >
                      Set up payment account
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="setup" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Account Setup</CardTitle>
              <CardDescription>
                Set up your Stripe Connect account to {user?.accountType === 'worker' ? 'receive' : 'make'} payments securely
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <StripeConnectSetup />
                
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-blue-800 text-xs flex items-start">
                  <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Why do we use Stripe Connect?</p>
                    <p>
                      Stripe Connect allows us to process payments securely while ensuring that 
                      your banking information is never stored on our servers. This gives you added
                      security and peace of mind when sending or receiving payments.
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="outline"
                  className="mt-2 w-full sm:w-auto"
                  onClick={() => window.open('/stripe-dashboard', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Stripe Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsContent;