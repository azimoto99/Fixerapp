import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import PageMeta from '@/components/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  Building2, 
  Navigation,
  Briefcase,
  Star,
  Filter,
  Search,
  ExternalLink,
  Calendar,
  User
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';
import { useLocation } from 'wouter';

interface HubPin {
  id: number;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  pinSize: string;
  pinColor: string;
  iconUrl?: string;
  priority: number;
  isActive: boolean;
  business: {
    id: number;
    businessName: string;
    businessLogo?: string;
    verificationStatus: string;
  };
}

interface NearbyItem {
  type: 'job' | 'hubpin';
  data: Job | HubPin;
  distance: number;
}

export default function Explore() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'jobs' | 'hubpins'>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'date' | 'amount'>('distance');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedHubPin, setSelectedHubPin] = useState<HubPin | null>(null);

  // Get user's current location
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setUserLocation({ latitude: user.latitude, longitude: user.longitude });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to a default location if needed
        }
      );
    }
  }, [user]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch nearby jobs and hub pins
  useEffect(() => {
    const fetchNearbyItems = async () => {
      if (!userLocation) return;

      setLoading(true);
      try {
        // Fetch nearby jobs
        const jobsResponse = await apiRequest('GET', '/api/jobs/nearby', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: 25 // 25 mile radius
        });

        // Fetch active hub pins
        const hubPinsResponse = await apiRequest('GET', '/api/enterprise/hub-pins/active');

        const jobs = Array.isArray(jobsResponse) ? jobsResponse : [];
        const hubPins = Array.isArray(hubPinsResponse) ? hubPinsResponse : [];

        // Calculate distances and combine items
        const nearbyJobItems: NearbyItem[] = jobs.map((job: Job) => ({
          type: 'job' as const,
          data: job,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            job.latitude,
            job.longitude
          )
        }));

        const nearbyHubPinItems: NearbyItem[] = hubPins.map((hubPin: HubPin) => ({
          type: 'hubpin' as const,
          data: hubPin,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            hubPin.latitude,
            hubPin.longitude
          )
        }));

        const allItems = [...nearbyJobItems, ...nearbyHubPinItems];
        setNearbyItems(allItems);
      } catch (error) {
        console.error('Error fetching nearby items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyItems();
  }, [userLocation]);

  // Filter and sort items
  const filteredAndSortedItems = nearbyItems
    .filter(item => {
      // Filter by type
      if (filterType !== 'all' && 
          ((filterType === 'jobs' && item.type !== 'job') || 
           (filterType === 'hubpins' && item.type !== 'hubpin'))) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (item.type === 'job') {
          const job = item.data as Job;
          return job.title.toLowerCase().includes(searchLower) ||
                 job.description.toLowerCase().includes(searchLower) ||
                 job.category.toLowerCase().includes(searchLower);
        } else {
          const hubPin = item.data as HubPin;
          return hubPin.title.toLowerCase().includes(searchLower) ||
                 hubPin.description.toLowerCase().includes(searchLower) ||
                 hubPin.business.businessName.toLowerCase().includes(searchLower);
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'date':
          if (a.type === 'job' && b.type === 'job') {
            const jobA = a.data as Job;
            const jobB = b.data as Job;
            return new Date(jobB.datePosted || 0).getTime() - new Date(jobA.datePosted || 0).getTime();
          }
          return a.distance - b.distance;
        case 'amount':
          if (a.type === 'job' && b.type === 'job') {
            const jobA = a.data as Job;
            const jobB = b.data as Job;
            return jobB.paymentAmount - jobA.paymentAmount;
          }
          return a.distance - b.distance;
        default:
          return 0;
      }
    });

  const renderJobCard = (item: NearbyItem) => {
    const job = item.data as Job;
    return (
      <Card key={`job-${job.id}`} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {job.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{job.location}</span>
                <span>•</span>
                <Navigation className="h-3 w-3" />
                <span>{item.distance.toFixed(1)} miles away</span>
              </div>
            </div>
            <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {job.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="font-medium">${job.paymentAmount}</span>
                <span className="text-muted-foreground">/{job.paymentType}</span>
              </div>
              {job.estimatedHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-orange-600" />
                  <span>{job.estimatedHours}h</span>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSelectedJob(job)}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderHubPinCard = (item: NearbyItem) => {
    const hubPin = item.data as HubPin;
    return (
      <Card key={`hubpin-${hubPin.id}`} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                {hubPin.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{hubPin.location}</span>
                <span>•</span>
                <Navigation className="h-3 w-3" />
                <span>{item.distance.toFixed(1)} miles away</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={hubPin.business.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                {hubPin.business.verificationStatus}
              </Badge>
              {hubPin.business.verificationStatus === 'verified' && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {hubPin.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{hubPin.business.businessName}</span>
              <Badge variant="outline" className="text-xs">
                Hub Pin
              </Badge>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSelectedHubPin(hubPin)}
            >
              View Hub
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Finding nearby opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <PageMeta
        title="Explore Local Jobs & Services Near You | Fixer"
        description="Find local jobs, skilled workers, and verified businesses in your area. Explore opportunities and connect with the community on Fixer."
        keywords={['local jobs', 'nearby work', 'freelance opportunities', 'local services', 'skilled workers', 'job search']}
        type="website"
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Explore Nearby</h1>
        <p className="text-muted-foreground">
          Discover jobs and business hubs in your area
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, businesses, or locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: 'all' | 'jobs' | 'hubpins') => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="jobs">Jobs</SelectItem>
                  <SelectItem value="hubpins">Hub Pins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: 'distance' | 'date' | 'amount') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Nearby Opportunities ({filteredAndSortedItems.length})
          </h2>
          <ScrollArea className="h-[600px]">
            {filteredAndSortedItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? "Try adjusting your search terms or filters"
                      : "There are no jobs or hub pins in your area right now"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAndSortedItems.map((item) => 
                item.type === 'job' ? renderJobCard(item) : renderHubPinCard(item)
              )
            )}
          </ScrollArea>
        </div>

        {/* Map placeholder - you can integrate with your existing map component */}
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Map View
          </h2>
          <Card className="h-[600px]">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4" />
                <p>Map integration coming soon</p>
                <p className="text-sm">This will show all nearby items on an interactive map</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  {selectedJob.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedJob.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {new Date(selectedJob.datePosted || '').toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">${selectedJob.paymentAmount}</span>
                    <span className="text-muted-foreground">/{selectedJob.paymentType}</span>
                  </div>
                  {selectedJob.estimatedHours && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span>{selectedJob.estimatedHours} hours estimated</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Category</h3>
                  <Badge variant="outline">{selectedJob.category}</Badge>
                </div>

                {selectedJob.equipmentProvided && (
                  <div>
                    <Badge variant="secondary">Equipment Provided</Badge>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      navigate(`/?jobId=${selectedJob.id}`);
                      setSelectedJob(null);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedJob(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hub Pin Detail Modal */}
      <Dialog open={!!selectedHubPin} onOpenChange={() => setSelectedHubPin(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedHubPin && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  {selectedHubPin.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedHubPin.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedHubPin.business.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                      {selectedHubPin.business.verificationStatus}
                    </Badge>
                    {selectedHubPin.business.verificationStatus === 'verified' && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Business</h3>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedHubPin.business.businessName}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedHubPin.description}</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      navigate(`/?hubPinId=${selectedHubPin.id}`);
                      setSelectedHubPin(null);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Map
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedHubPin(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
