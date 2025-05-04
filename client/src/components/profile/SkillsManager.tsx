import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, PlusCircle } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SkillsManagerProps {
  user: User;
  readOnly?: boolean;
}

export function SkillsManager({ user, readOnly = false }: SkillsManagerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>(user.skills || []);

  // Fetch all available skills
  const { data: availableSkills = [] } = useQuery({
    queryKey: ['/api/skills'],
    queryFn: async () => {
      const response = await fetch('/api/skills');
      return response.json();
    },
  });

  // Update when user prop changes
  useEffect(() => {
    setUserSkills(user.skills || []);
  }, [user.skills]);

  const updateSkillsMutation = useMutation({
    mutationFn: async (skills: string[]) => {
      const response = await apiRequest(
        'POST',
        `/api/users/${user.id}/skills`,
        { skills }
      );
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the cache with new user data
      queryClient.setQueryData(['/api/user'], updatedUser);
      
      toast({
        title: 'Skills updated',
        description: 'Your skills have been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
      
      // Reset skills to original on error
      setUserSkills(user.skills || []);
    },
  });

  const verifySkillMutation = useMutation({
    mutationFn: async ({ skill, verified }: { skill: string; verified: boolean }) => {
      const response = await apiRequest(
        'POST',
        `/api/users/${user.id}/skills/${skill}/verify`,
        { verified }
      );
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the cache with new user data
      queryClient.setQueryData(['/api/user'], updatedUser);
      
      toast({
        title: 'Skill verified',
        description: 'Skill verification status updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleSkill = (skill: string) => {
    if (readOnly) return;
    
    let updatedSkills: string[];
    
    // If skill already exists, remove it
    if (userSkills.includes(skill)) {
      updatedSkills = userSkills.filter(s => s !== skill);
    } 
    // Otherwise add it
    else {
      updatedSkills = [...userSkills, skill];
    }
    
    setUserSkills(updatedSkills);
    updateSkillsMutation.mutate(updatedSkills);
  };

  const handleVerifySkill = (skill: string, verified: boolean) => {
    if (readOnly) return;
    verifySkillMutation.mutate({ skill, verified });
  };

  const getSkillVerificationStatus = (skill: string) => {
    return user.skillsVerified?.[skill] || false;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {userSkills.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No skills added yet</p>
        ) : (
          userSkills.map((skill) => (
            <Badge 
              key={skill} 
              variant={getSkillVerificationStatus(skill) ? "default" : "secondary"}
              className="flex items-center gap-1 pr-1"
            >
              {skill}
              {!readOnly && (
                <button
                  onClick={() => handleToggleSkill(skill)}
                  className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                  aria-label={`Remove ${skill} skill`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {getSkillVerificationStatus(skill) && (
                <Check className="h-3 w-3 ml-0.5 text-green-500" />
              )}
            </Badge>
          ))
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1" 
                disabled={updateSkillsMutation.isPending}
              >
                <PlusCircle className="h-4 w-4" />
                Add Skills
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandInput placeholder="Search skills..." />
                <CommandList>
                  <CommandEmpty>No skills found.</CommandEmpty>
                  <CommandGroup>
                    {availableSkills.map((skill: string) => {
                      const isSelected = userSkills.includes(skill);
                      return (
                        <CommandItem
                          key={skill}
                          onSelect={() => handleToggleSkill(skill)}
                          className="flex items-center gap-2"
                        >
                          <Checkbox checked={isSelected} />
                          <span>{skill}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Verify option is shown for development but would be admin-only in prod */}
          {userSkills.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => {
                // For demo purposes, verify all skills
                userSkills.forEach(skill => {
                  if (!getSkillVerificationStatus(skill)) {
                    handleVerifySkill(skill, true);
                  }
                });
              }}
              disabled={verifySkillMutation.isPending}
            >
              Verify All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}