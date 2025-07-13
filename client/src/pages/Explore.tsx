import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import PageMeta from '@/components/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Navigation,
  Briefcase,
  Search,
  ExternalLink,
  Calendar,
  Target
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { Job } from '@/types';
import { useLocation } from 'wouter';

interface JobWithDistance extends Job {
  distance: number;
}

export default function Explore() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [nearbyJobs, setNearbyJobs] = useState<JobWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'distance' | 'date' | 'amount'>('distance');
  const [maxDistance, setMaxDistance] = useState<number>(25); // Default 25 miles
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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

  // Fetch nearby jobs
  useEffect(() => {
    const fetchNearbyJobs = async () => {
      if (!userLocation) return;

      setLoading(true);
      try {
        console.log(`🔍 Explore: Fetching jobs within ${maxDistance} miles of location:`, userLocation);
        
        // Fetch all jobs with coordinates
        const response = await apiRequest('GET', '/api/jobs?hasCoordinates=true');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch jobs: ${response.status}`);
        }
        
        const allJobs = await response.json();
        console.log(`📍 Explore: Retrieved ${allJobs.length} jobs with coordinates`);

        // Filter jobs to only open status and calculate distances
        const jobsWithDistance: JobWithDistance[] = allJobs
          .filter((job: Job) => job.status === 'open' && job.latitude && job.longitude)
          .map((job: Job) => {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              job.latitude,
              job.longitude
            );
            return {
              ...job,
              distance
            };
          })
          .filter((job: JobWithDistance) => job.distance <= maxDistance); // Filter by max distance

        console.log(`🎯 Explore: Found ${jobsWithDistance.length} jobs within ${maxDistance} miles`);
        setNearbyJobs(jobsWithDistance);
      } catch (error) {
        console.error('Error fetching nearby jobs:', error);
        setNearbyJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyJobs();
  }, [userLocation, maxDistance]);

  // Filter and sort jobs
  const filteredAndSortedJobs = nearbyJobs
    .filter(job => {
      // Filter by search query
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return job.title.toLowerCase().includes(searchLower) ||
               job.description.toLowerCase().includes(searchLower) ||
               job.category.toLowerCase().includes(searchLower) ||
               job.location.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'date':
          return new Date(b.datePosted || 0).getTime() - new Date(a.datePosted || 0).getTime();
        case 'amount':
          return b.paymentAmount - a.paymentAmount;
        default:
          return a.distance - b.distance;
      }
    });

  const renderJobCard = (job: JobWithDistance) => {
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
                <span>{job.distance.toFixed(1)} miles away</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {job.category}
              </Badge>
              <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                {job.status}
              </Badge>
            </div>
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
              {job.dateNeeded && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-orange-600" />
                  <span>{new Date(job.dateNeeded).toLocaleDateString()}</span>
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
        <h1 className="text-2xl font-bold mb-2">Explore Nearby Jobs</h1>
        <p className="text-muted-foreground">
          Find local job opportunities within your preferred distance
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title, description, category, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Distance Slider and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Distance Range: {maxDistance} miles
                </Label>
                <Slider
                  value={[maxDistance]}
                  onValueChange={(value) => setMaxDistance(value[0])}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 mile</span>
                  <span>100 miles</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: 'distance' | 'date' | 'amount') => setSortBy(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="date">Date Posted</SelectItem>
                    <SelectItem value="amount">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Nearby Jobs ({filteredAndSortedJobs.length})
            </h2>
            {userLocation && (
              <div className="text-sm text-muted-foreground">
                Within {maxDistance} miles of your location
              </div>
            )}
          </div>
          
          <ScrollArea className="h-[700px]">
            {filteredAndSortedJobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Try adjusting your search terms or increasing the distance range"
                      : "There are no open jobs in your selected area"
                    }
                  </p>
                  {maxDistance < 50 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setMaxDistance(50)}
                      className="mt-2"
                    >
                      Expand to 50 miles
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredAndSortedJobs.map((job) => renderJobCard(job))
            )}
          </ScrollArea>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Stats
          </h2>
          
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Jobs</span>
                <span className="font-medium">{nearbyJobs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">After Filters</span>
                <span className="font-medium">{filteredAndSortedJobs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Distance Range</span>
                <span className="font-medium">{maxDistance} miles</span>
              </div>
              {filteredAndSortedJobs.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Closest Job</span>
                    <span className="font-medium">{filteredAndSortedJobs[0]?.distance.toFixed(1)} mi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Highest Pay</span>
                    <span className="font-medium">
                      ${Math.max(...filteredAndSortedJobs.map(j => j.paymentAmount))}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {userLocation && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Your Location</h3>
                <div className="text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </div>
              </CardContent>
            </Card>
          )}
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
    </div>
  );
}
