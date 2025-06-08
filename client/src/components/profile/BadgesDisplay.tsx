import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Badge, UserBadge } from '@shared/schema';
import { Badge as UIBadge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { AwardIcon, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';

interface BadgesDisplayProps {
  userId: number;
}

export function BadgesDisplay({ userId }: BadgesDisplayProps) {
  const [selectedBadge, setSelectedBadge] = useState<{
    badge: Badge;
    userBadge: UserBadge;
  } | null>(null);

  // Fetch user's badges
  const { data: userBadges = [], isLoading: isLoadingUserBadges } = useQuery({
    queryKey: [`/api/users/${userId}/badges`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}/badges`);
      return response.json();
    },
  });

  // Fetch all badge details
  const { data: allBadges = [], isLoading: isLoadingBadges } = useQuery({
    queryKey: ['/api/badges'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/badges');
      return response.json();
    },
  });

  const getBadgeDetails = (badgeId: number) => {
    return allBadges.find((badge: Badge) => badge.id === badgeId);
  };

  const handleBadgeClick = (userBadge: UserBadge) => {
    const badge = getBadgeDetails(userBadge.badgeId);
    if (badge) {
      setSelectedBadge({ badge, userBadge });
    }
  };

  if (isLoadingUserBadges || isLoadingBadges) {
    return <div className="text-sm text-gray-500">Loading badges...</div>;
  }

  if (userBadges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-md text-center">
        <AwardIcon className="h-10 w-10 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No badges earned yet</p>
        <p className="text-xs text-gray-400 mt-1">Complete jobs to earn badges!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {userBadges.map((userBadge: UserBadge) => {
          const badge = getBadgeDetails(userBadge.badgeId);
          if (!badge) return null;
          
          return (
            <TooltipProvider key={userBadge.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="flex flex-col items-center justify-center p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleBadgeClick(userBadge)}
                  >
                    <div className="w-12 h-12 flex items-center justify-center mb-1">
                      {badge.iconUrl ? (
                        <img 
                          src={badge.iconUrl} 
                          alt={badge.name} 
                          className="max-w-full max-h-full" 
                        />
                      ) : (
                        <AwardIcon className="h-10 w-10 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-center font-medium truncate w-full">
                      {badge.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{badge.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {selectedBadge && (
        <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedBadge.badge.iconUrl ? (
                  <img 
                    src={selectedBadge.badge.iconUrl} 
                    alt={selectedBadge.badge.name} 
                    className="w-6 h-6" 
                  />
                ) : (
                  <AwardIcon className="h-6 w-6 text-primary" />
                )}
                {selectedBadge.badge.name}
              </DialogTitle>
              <DialogDescription>
                {selectedBadge.badge.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-1">
                  <Info className="h-4 w-4" />
                  Details
                </h4>
                <UIBadge variant="outline" className="mr-1">
                  {selectedBadge.badge.category}
                </UIBadge>
                {selectedBadge.badge.tier && (
                  <UIBadge variant="secondary">
                    Tier {selectedBadge.badge.tier}
                  </UIBadge>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-1">
                  <Calendar className="h-4 w-4" />
                  Earned
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedBadge.userBadge.earnedAt ? 
                    format(new Date(selectedBadge.userBadge.earnedAt), 'PPP') : 
                    'Unknown date'}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}