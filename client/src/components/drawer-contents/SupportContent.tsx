import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, MessageSquare, AlertTriangle, DollarSign, Plus, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SupportTicket {
  id: number;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  jobId?: number;
}

interface Job {
  id: number;
  title: string;
  status: string;
  datePosted: string;
}

export default function SupportContent() {
  const [activeView, setActiveView] = useState<'main' | 'create-ticket' | 'create-dispute' | 'my-tickets'>('main');
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isCreateDisputeOpen, setIsCreateDisputeOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['/api/support/tickets'],
    enabled: activeView === 'my-tickets'
  });

  // Fetch user's jobs for dispute forms
  const { data: userJobs = [] } = useQuery<Job[]>({
    queryKey: ['/api/jobs/user'],
    enabled: isCreateDisputeOpen
  });

  // Create support ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/support/tickets', data),
    onSuccess: () => {
      toast({
        title: "Support Ticket Created",
        description: "Your support ticket has been submitted successfully.",
      });
      setIsCreateTicketOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/support/disputes', data),
    onSuccess: () => {
      toast({
        title: "Dispute Filed",
        description: "Your dispute has been submitted for review.",
      });
      setIsCreateDisputeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to file dispute. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreateTicket = (formData: FormData) => {
    const data = {
      category: formData.get('category'),
      subject: formData.get('subject'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      jobId: formData.get('jobId') ? parseInt(formData.get('jobId') as string) : null
    };
    createTicketMutation.mutate(data);
  };

  const handleCreateDispute = (formData: FormData) => {
    const data = {
      jobId: formData.get('jobId'),
      disputeType: formData.get('disputeType'),
      description: formData.get('description'),
      requestedResolution: formData.get('requestedResolution'),
      urgency: formData.get('urgency')
    };
    createDisputeMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'open': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      'low': 'bg-blue-100 text-blue-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800';
  };

  if (activeView === 'my-tickets') {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveView('main')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">My Support Tickets</h2>
            <p className="text-muted-foreground">Track your support requests and disputes</p>
          </div>
        </div>

        <div className="space-y-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No support tickets found</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setActiveView('main')}
                >
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket: SupportTicket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <CardDescription>Ticket #{ticket.ticketNumber}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getStatusBadge(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityBadge(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Created {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Support Center</h2>
        <p className="text-muted-foreground">
          Get help, report issues, or contact our support team
        </p>
      </div>
      
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">General Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Get help with account issues, platform features, or general questions
            </CardDescription>
            <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Create Support Ticket</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateTicket(new FormData(e.currentTarget));
                }}>
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll help you resolve it quickly.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACCOUNT_ISSUE">Account Issue</SelectItem>
                          <SelectItem value="TECHNICAL_SUPPORT">Technical Support</SelectItem>
                          <SelectItem value="BILLING_QUESTION">Billing Question</SelectItem>
                          <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select name="priority" defaultValue="medium">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input name="subject" placeholder="Brief description of your issue" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        name="description" 
                        placeholder="Please provide detailed information about your issue"
                        rows={4}
                        required 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createTicketMutation.isPending}>
                      {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">File Dispute</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Report problems with jobs, payments, or user behavior
            </CardDescription>
            <Dialog open={isCreateDisputeOpen} onOpenChange={setIsCreateDisputeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">File Dispute</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateDispute(new FormData(e.currentTarget));
                }}>
                  <DialogHeader>
                    <DialogTitle>File a Dispute</DialogTitle>
                    <DialogDescription>
                      Report issues with a specific job or transaction.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobId">Related Job</Label>
                      <Select name="jobId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {userJobs.map((job) => (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title} - {job.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disputeType">Dispute Type</Label>
                      <Select name="disputeType" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dispute type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WORK_NOT_COMPLETED">Work Not Completed</SelectItem>
                          <SelectItem value="POOR_QUALITY">Poor Quality Work</SelectItem>
                          <SelectItem value="PAYMENT_ISSUE">Payment Issue</SelectItem>
                          <SelectItem value="NO_SHOW">No Show</SelectItem>
                          <SelectItem value="SAFETY_CONCERN">Safety Concern</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select name="urgency" defaultValue="high">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        name="description" 
                        placeholder="Describe what happened and provide any relevant details"
                        rows={4}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestedResolution">Requested Resolution</Label>
                      <Textarea 
                        name="requestedResolution" 
                        placeholder="What outcome are you seeking?"
                        rows={3}
                        required 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createDisputeMutation.isPending}>
                      {createDisputeMutation.isPending ? 'Filing...' : 'File Dispute'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Payment Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Issues with payments, refunds, or billing questions
            </CardDescription>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setIsCreateTicketOpen(true);
              }}
            >
              Request Payment Help
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">My Tickets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              View and manage your existing support tickets
            </CardDescription>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => setActiveView('my-tickets')}
            >
              View My Tickets ({tickets.length})
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}