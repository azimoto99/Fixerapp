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
  const reviewCount = 0; // Will be implemented when reviews system is complete
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
    <div className="space-y-4">
      {/* Header - User Identity */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-background shadow-lg">
                <AvatarImage 
                  src={user.avatarUrl || ''} 
                  alt={user.fullName || user.username}
                  className="object-cover"
                />
                <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                  {(user.fullName || user.username)?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground truncate max-w-full">
                {user.fullName || user.username}
              </h2>
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Member since {memberSince}</span>
              </div>
              
              {user.location && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-full">{user.location}</span>
                </div>
              )}
              
              {avgRating > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-sm">{avgRating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs">({reviewCount} reviews)</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      {user.accountType === 'worker' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Performance Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Jobs Done</span>
                </div>
                <p className="text-sm font-semibold">{completedJobs}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Earned</span>
                </div>
                <p className="text-sm font-semibold">${totalEarnings.toFixed(0)}</p>
              </div>
              
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                </div>
                <p className="text-sm font-semibold">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-500" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SkillsManager user={user} />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {user.accountType === 'worker' && recentJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentJobs.map((job, index) => (
                <div key={job.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.dateCompleted ? format(new Date(job.dateCompleted), 'MMM d') : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-0 flex-shrink-0">
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