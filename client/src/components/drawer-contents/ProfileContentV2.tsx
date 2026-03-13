import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  DollarSign,
  Edit,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { type Earning, type Job, type User } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileContentV2Props {
  user: User;
  onSignOut: () => void;
}

function openDrawerTab(tab: string) {
  window.dispatchEvent(new CustomEvent("switch-user-drawer-tab", { detail: tab }));
}

export default function ProfileContentV2({ user, onSignOut }: ProfileContentV2Props) {
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { workerId: user.id }],
    enabled: user.accountType === "worker",
  });

  const { data: earnings = [] } = useQuery<Earning[]>({
    queryKey: ["/api/earnings"],
    enabled: user.accountType === "worker",
  });

  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const totalEarnings = earnings.reduce((sum, earning) => sum + (earning.amount || 0), 0);
  const successRate = user.successRate ?? (completedJobs > 0 ? 100 : 0);
  const memberSince = user.lastActive ? format(new Date(user.lastActive), "MMM yyyy") : "Recently";
  const recentJobs = jobs
    .filter((job) => job.status === "completed")
    .sort((a, b) => new Date(b.completionTime || 0).getTime() - new Date(a.completionTime || 0).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatarUrl || ""} alt={user.fullName || user.username} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10">
                {(user.fullName || user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">{user.fullName || user.username}</h2>

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

              {(user.rating || 0) > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{(user.rating || 0).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {user.accountType === "worker" && (
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

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Rating</span>
                </div>
                <p className="text-lg font-semibold">{(user.rating || 0).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {user.accountType === "worker" && recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.completionTime ? format(new Date(job.completionTime), "MMM d") : "Recently"}
                    </p>
                  </div>
                  <Badge variant="secondary">${job.paymentAmount}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => openDrawerTab("settings")}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>

          <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => openDrawerTab("settings")}>
            <Settings className="h-4 w-4 mr-2" />
            Settings & Preferences
          </Button>

          {user.isAdmin && (
            <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => (window.location.href = "/admin")}>
              <Shield className="h-4 w-4 mr-2" />
              Admin Panel
            </Button>
          )}

          <Button variant="destructive" className="w-full justify-start" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
