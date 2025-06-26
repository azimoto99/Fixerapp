import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  MapPin, 
  Users, 
  Briefcase,
  BarChart3,
  Settings,
  Plus,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  UserCheck,
  Clock,
  DollarSign,
  CheckCircle,
  Star,
  LogOut
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import HubPinManager from '@/components/enterprise/HubPinManager';
import PositionManager from '@/components/enterprise/PositionManager';
import ApplicationsManager from '@/components/enterprise/ApplicationsManager';
import BusinessSettings from '@/components/enterprise/BusinessSettings';
import EnterpriseAnalytics from '@/components/enterprise/EnterpriseAnalytics';

interface EnterpriseStats {
  totalPositions: number;
  activePositions: number;
  totalApplications: number;
  pendingApplications: number;
  hiredThisMonth: number;
  averageTimeToHire: number;
  totalHubPins: number;
  activeHubPins: number;
}

export default function EnterpriseDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch enterprise business details
  const { data: businessData, isLoading: businessLoading } = useQuery({
    queryKey: ['/api/enterprise/business'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/enterprise/business');
      return res.json();
    },
    enabled: !!user && user.accountType === 'enterprise'
  });

  // Fetch enterprise statistics
  const { data: stats } = useQuery<EnterpriseStats>({
    queryKey: ['/api/enterprise/stats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/enterprise/stats');
      return res.json();
    },
    enabled: !!businessData
  });

  // Create business profile if it doesn't exist
  const createBusinessMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🏢 Creating business profile with data:', data);
      console.log('🏢 Current user:', user);
      
      try {
        const res = await apiRequest('POST', '/api/enterprise/business', data, {
          timeout: 45000 // 45 second timeout specifically for this request
        });
        console.log('🏢 Business profile creation response received');
        return res.json();
      } catch (error) {
        console.error('🏢 Business profile creation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🏢 Business profile created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/enterprise/business'] });
      toast({
        title: 'Business Profile Created',
        description: 'Your business profile has been created successfully.',
      });
    },
    onError: (error: any) => {
      console.error('🏢 Business profile creation mutation error:', error);
      toast({
        title: 'Error Creating Business Profile',
        description: error.message || 'Failed to create business profile. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Business onboarding for new enterprise accounts
  if (!businessLoading && !businessData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Welcome to Fixer Business
            </CardTitle>
            <CardDescription>
              Let's set up your business profile to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createBusinessMutation.mutate({
                businessName: formData.get('businessName'),
                businessDescription: formData.get('businessDescription'),
                businessWebsite: formData.get('businessWebsite'),
                businessPhone: formData.get('businessPhone'),
                businessEmail: formData.get('businessEmail'),
              });
            }} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Business Name *</label>
                <input
                  name="businessName"
                  type="text"
                  required
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Business Description</label>
                <textarea
                  name="businessDescription"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Tell us about your business..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Business Website</label>
                  <input
                    name="businessWebsite"
                    type="url"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="https://yourbusiness.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Business Phone</label>
                  <input
                    name="businessPhone"
                    type="tel"
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Business Email</label>
                <input
                  name="businessEmail"
                  type="email"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="contact@yourbusiness.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createBusinessMutation.isPending}>
                {createBusinessMutation.isPending ? 'Creating...' : 'Create Business Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {businessData?.businessName || 'Business Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant={businessData?.verificationStatus === 'verified' ? 'default' : 'secondary'}>
              {businessData?.verificationStatus || 'Pending Verification'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
              <LogOut className="h-4 w-4 mr-1" />
              {logoutMutation.isPending ? 'Signing Out…' : 'Sign Out'}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Manage your business presence, positions, and applications
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePositions || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.totalPositions || 0} total positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.totalApplications || 0} total applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired This Month</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.hiredThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              new team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageTimeToHire ? `${stats.averageTimeToHire} days` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              across all positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hub-pins">Hub Pins</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <EnterpriseAnalytics businessId={businessData?.id} />
        </TabsContent>

        <TabsContent value="hub-pins" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hub Pin Management</CardTitle>
                  <CardDescription>
                    Create and manage your business locations on the map
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {stats?.activeHubPins || 0} / {stats?.totalHubPins || 0} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <HubPinManager businessId={businessData?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Position Management</CardTitle>
                  <CardDescription>
                    Manage your open positions and job postings
                  </CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Position
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PositionManager businessId={businessData?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Management</CardTitle>
              <CardDescription>
                Review and manage applications to your positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationsManager businessId={businessData?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <BusinessSettings businessData={businessData} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 