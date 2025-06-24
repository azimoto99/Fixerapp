import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users,
  Calendar,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Star,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { EnterprisePosition, EnterpriseBusiness, HubPin } from '@/server/types';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EnterpriseJobCardProps {
  hubPinId: number;
  onClose?: () => void;
  onApply?: (positionId: number) => void;
}

export default function EnterpriseJobCard({ hubPinId, onClose, onApply }: EnterpriseJobCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Fetch hub pin details with business and positions
  const { data: hubPinData, isLoading } = useQuery({
    queryKey: ['/api/enterprise/hub-pins', hubPinId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/enterprise/hub-pins/${hubPinId}`);
      return res.json();
    }
  });

  // Quick apply mutation
  const applyMutation = useMutation({
    mutationFn: async (positionId: number) => {
      const res = await apiRequest('POST', `/api/enterprise/positions/${positionId}/apply`, {
        quickApply: true
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/hub-pins', hubPinId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Application Failed',
        description: error.message || 'Failed to submit application',
        variant: 'destructive'
      });
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const { business, positions, hubPin } = hubPinData || {};

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      {/* Business Header */}
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {business?.businessLogo ? (
              <img 
                src={business.businessLogo} 
                alt={business.businessName}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl mb-1">{business?.businessName}</CardTitle>
              <CardDescription className="text-base">{business?.businessDescription}</CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {hubPin?.location}
                </span>
                {business?.verificationStatus === 'verified' && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Verified Business
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>

        {/* Business Contact Info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {business?.businessWebsite && (
            <a 
              href={business.businessWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Globe className="h-3 w-3" />
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {business?.businessPhone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {business.businessPhone}
            </span>
          )}
          {business?.businessEmail && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {business.businessEmail}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {positions && positions.length > 0 ? (
          <Tabs defaultValue={positions[0]?.id.toString()} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
              <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex">
                  {positions.map((position: EnterprisePosition) => (
                    <TabsTrigger
                      key={position.id}
                      value={position.id.toString()}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3"
                      onClick={() => setSelectedPosition(position.id)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{position.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {position.positionsAvailable} position{position.positionsAvailable !== 1 ? 's' : ''} available
                        </div>
                      </div>
                    </TabsTrigger>
                  ))}
                </div>
              </ScrollArea>
            </TabsList>

            {positions.map((position: EnterprisePosition) => (
              <TabsContent key={position.id} value={position.id.toString()} className="p-6">
                <div className="space-y-6">
                  {/* Position Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{position.title}</h3>
                    <p className="text-muted-foreground mb-4">{position.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Type:</strong> {position.positionType.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Pay:</strong> ${position.paymentAmount}/
                            {position.paymentType === 'hourly' ? 'hr' : position.paymentFrequency || position.paymentType}
                          </span>
                        </div>
                        {position.schedule && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <strong>Schedule:</strong> {position.schedule}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {position.requiredSkills && position.requiredSkills.length > 0 && (
                          <div>
                            <strong className="text-sm">Required Skills:</strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {position.requiredSkills.map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {position.benefits && (
                          <div>
                            <strong className="text-sm">Benefits:</strong>
                            <p className="text-sm text-muted-foreground mt-1">{position.benefits}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Apply Section */}
                  <div className="border-t pt-4">
                    {user ? (
                      user.accountType === 'worker' ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Ready to apply for this position?
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Your profile will be shared with {business?.businessName}
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              if (onApply) {
                                onApply(position.id);
                              } else {
                                applyMutation.mutate(position.id);
                              }
                            }}
                            disabled={applyMutation.isPending}
                          >
                            {applyMutation.isPending ? 'Applying...' : 'Quick Apply'}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Only worker accounts can apply for positions
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">
                          Sign in to apply for this position
                        </p>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
                          Sign In
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No open positions at this location</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 