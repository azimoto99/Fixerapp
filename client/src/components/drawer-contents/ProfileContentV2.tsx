import { DbUser } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from '@tanstack/react-query';
import { 
  User as UserIcon, 
  MapPin, 
  Calendar, 
  Star, 
  Trophy, 
  DollarSign,
  Target,
  TrendingUp,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  Edit,
  Award,
  Clock,
  Shield,
  Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { SkillsManager } from '@/components/profile/SkillsManager';

interface ProfileContentV2Props {
  user: DbUser;
  onSignOut: () => void;
}

export default function ProfileContentV2({ user, onSignOut }: ProfileContentV2Props) {
  // Fetch user's jobs for stats
  const { data: jobs } = useQuery({
    queryKey: ['/api/jobs', { workerId: user.id }],
    enabled: !!user && user.accountType === 'worker',
  });

  // Fetch user's earnings for stats
  const { data: earnings } = useQuery({
    queryKey: ['/api/earnings'],
    enabled: !!user && user.accountType === 'worker',
  });

  // Fetch recent applications/jobs
  const { data: applications } = useQuery({
    queryKey: ['/api/applications/worker', user.id],
    enabled: !!user && user.accountType === 'worker',
  });

  // Calculate stats
  const completedJobs = Array.isArray(jobs) ? jobs.filter(job => job.status === 'completed').length : 0;
  const totalEarnings = Array.isArray(earnings) ? earnings.reduce((sum, earning) => sum + (earning.amount || 0), 0) : 0;
  const avgRating = user.rating || 0;
  // TODO: Fetch actual review count from reviews API
  const reviewCount = 0; // Currently hardcoded, will be fetched from reviews table
  const successRate = completedJobs > 0 ? Math.round((completedJobs / (completedJobs + 0)) * 100) : 100;

  // Recent activity (last 3 completed jobs)
  const recentJobs = Array.isArray(jobs) 
    ? jobs
        .filter(job => job.status === 'completed')
        .sort((a, b) => new Date(b.dateCompleted || '').getTime() - new Date(a.dateCompleted || '').getTime())
        .slice(0, 3)
    : [];

  const memberSince = user.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header - User Identity */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                <AvatarImage 
                  src={user.avatarUrl || ''} 
                  alt={user.fullName || user.username}
                  className="object-cover"
                />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                  {(user.fullName || user.username)?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                {user.fullName || user.username}
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member since {memberSince}</span>
              </div>
              
              {user.location && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{user.location}</span>
                </div>
              )}
              
              {avgRating > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{avgRating.toFixed(1)}</span>
                  </div>
                  {/* Review count will be shown when implemented */}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      {user.accountType === 'worker' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Performance Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Jobs Completed</span>
                </div>
                <p className="text-lg font-semibold">{completedJobs}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Total Earned</span>
                </div>
                <p className="text-lg font-semibold">${totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                </div>
                <p className="text-lg font-semibold">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkillsManager user={user} />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {user.accountType === 'worker' && recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job, index) => (
                <div key={job.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.dateCompleted ? format(new Date(job.dateCompleted), 'MMM d') : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ${job.paymentAmount}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}