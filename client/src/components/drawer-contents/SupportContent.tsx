import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  MessageCircle,
  Ticket,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Send,
  HelpCircle,
  Shield,
  AlertCircle,
  DollarSign,
  User,
  Bug
} from 'lucide-react';

const DISPUTE_TYPES = {
  JOB_NOT_COMPLETED: "Worker didn't complete the job",
  POOR_QUALITY: "Work quality was unsatisfactory", 
  NO_SHOW: "Worker didn't show up",
  PAYMENT_ERROR: "Payment was charged incorrectly",
  OVERCHARGED: "Was charged more than agreed amount",
  FRAUD_WORKER: "Suspicious worker behavior",
  FRAUD_POSTER: "Fake job posting",
  HARASSMENT: "Inappropriate behavior/messages",
  SAFETY_CONCERN: "Safety issue during job"
};

const TICKET_CATEGORIES = {
  JOB_DISPUTE: "Job Dispute",
  PAYMENT_ISSUE: "Payment Problem",
  FRAUD_REPORT: "Report Fraud/Scam",
  ACCOUNT_ISSUE: "Account Issue",
  TECHNICAL_BUG: "Technical Bug",
  GENERAL_INQUIRY: "General Question"
};

export default function SupportContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
    jobId: ''
  });
  const [disputeForm, setDisputeForm] = useState({
    jobId: '',
    disputeType: '',
    description: '',
    requestedResolution: '',
    urgency: 'medium'
  });

  // Fetch user's support tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['/api/support/tickets'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/support/tickets');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch user's jobs for dispute forms
  const { data: userJobs = [] } = useQuery({
    queryKey: ['/api/jobs/user'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/jobs/user');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  // Create support ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      const response = await apiRequest('POST', '/api/support/tickets', ticketData);
      if (!response.ok) {
        throw new Error('Failed to create support ticket');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setShowTicketDialog(false);
      setTicketForm({ category: '', subject: '', description: '', priority: 'medium', jobId: '' });
      toast({
        title: "Support Ticket Created",
        description: "We'll respond to your request within 24 hours",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (disputeData: any) => {
      const response = await apiRequest('POST', '/api/support/disputes', disputeData);
      if (!response.ok) {
        throw new Error('Failed to create dispute');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      setShowDisputeDialog(false);
      setDisputeForm({ jobId: '', disputeType: '', description: '', requestedResolution: '', urgency: 'medium' });
      toast({
        title: "Dispute Filed",
        description: "Our team will review your dispute within 48 hours",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to file dispute. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitTicket = () => {
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createTicketMutation.mutate(ticketForm);
  };

  const handleSubmitDispute = () => {
    if (!disputeForm.jobId || !disputeForm.disputeType || !disputeForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createDisputeMutation.mutate(disputeForm);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Help & Support</h2>
      </div>

      <Tabs defaultValue="contact" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="issues">Report Issue</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="help">Help Center</TabsTrigger>
        </TabsList>

        {/* Contact Support Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Contact Support</span>
              </CardTitle>
              <CardDescription>
                Get help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-16 flex-col space-y-2"
                  onClick={() => {
                    // Implement live chat functionality
                    toast({
                      title: "Live Chat",
                      description: "Live chat feature coming soon!",
                    });
                  }}
                >
                  <MessageCircle className="h-6 w-6" />
                  <span>Start Live Chat</span>
                </Button>
                
                <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-16 flex-col space-y-2">
                      <Ticket className="h-6 w-6" />
                      <span>Submit Ticket</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Submit Support Ticket</DialogTitle>
                      <DialogDescription>
                        Describe your issue and we'll help you resolve it
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({...ticketForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TICKET_CATEGORIES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Subject"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                      />
                      
                      <Textarea
                        placeholder="Describe your issue in detail..."
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                        rows={4}
                      />
                      
                      <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({...ticketForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        onClick={handleSubmitTicket} 
                        disabled={createTicketMutation.isPending}
                        className="w-full"
                      >
                        {createTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Issue Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Report an Issue</span>
              </CardTitle>
              <CardDescription>
                Select the type of issue you want to report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Job Dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>File Job Dispute</DialogTitle>
                      <DialogDescription>
                        Report issues with a specific job
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={disputeForm.jobId} onValueChange={(value) => setDisputeForm({...disputeForm, jobId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job" />
                        </SelectTrigger>
                        <SelectContent>
                          {userJobs.map((job: any) => (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title} - ${job.paymentAmount}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={disputeForm.disputeType} onValueChange={(value) => setDisputeForm({...disputeForm, disputeType: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type of dispute" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DISPUTE_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Textarea
                        placeholder="Describe what happened..."
                        value={disputeForm.description}
                        onChange={(e) => setDisputeForm({...disputeForm, description: e.target.value})}
                        rows={4}
                      />
                      
                      <Input
                        placeholder="What resolution are you seeking?"
                        value={disputeForm.requestedResolution}
                        onChange={(e) => setDisputeForm({...disputeForm, requestedResolution: e.target.value})}
                      />
                      
                      <Button 
                        onClick={handleSubmitDispute} 
                        disabled={createDisputeMutation.isPending}
                        className="w-full"
                      >
                        {createDisputeMutation.isPending ? "Filing..." : "File Dispute"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" className="justify-start" onClick={() => {
                  setTicketForm({...ticketForm, category: 'PAYMENT_ISSUE'});
                  setShowTicketDialog(true);
                }}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Payment Problem
                </Button>
                
                <Button variant="outline" className="justify-start" onClick={() => {
                  setTicketForm({...ticketForm, category: 'FRAUD_REPORT'});
                  setShowTicketDialog(true);
                }}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Report Fraud/Scam
                </Button>
                
                <Button variant="outline" className="justify-start" onClick={() => {
                  setTicketForm({...ticketForm, category: 'ACCOUNT_ISSUE'});
                  setShowTicketDialog(true);
                }}>
                  <User className="h-4 w-4 mr-2" />
                  Account Issue
                </Button>
                
                <Button variant="outline" className="justify-start" onClick={() => {
                  setTicketForm({...ticketForm, category: 'TECHNICAL_BUG'});
                  setShowTicketDialog(true);
                }}>
                  <Bug className="h-4 w-4 mr-2" />
                  Technical Bug
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>My Support Requests</span>
              </CardTitle>
              <CardDescription>
                View and track your support tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No support tickets yet</p>
                  <p className="text-sm">Create a ticket to get help with any issues</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <p className="font-medium">#{ticket.ticketNumber} - {ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">{ticket.category}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Center Tab */}
        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5" />
                <span>Help Center</span>
              </CardTitle>
              <CardDescription>
                Find answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Frequently Asked Questions</p>
                    <p className="text-sm text-muted-foreground">Common questions and answers</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">How to Use the App</p>
                    <p className="text-sm text-muted-foreground">Step-by-step guides</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Payment & Billing Info</p>
                    <p className="text-sm text-muted-foreground">Understanding payments and fees</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Community Guidelines</p>
                    <p className="text-sm text-muted-foreground">Rules and best practices</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}