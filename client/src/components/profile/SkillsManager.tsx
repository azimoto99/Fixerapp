import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DbUser } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, X, PlusCircle, Edit2, Save, XCircle } from 'lucide-react';

interface SkillsManagerProps {
  user: DbUser;
  readOnly?: boolean;
}

export function SkillsManager({ user, readOnly = false }: SkillsManagerProps) {
  const { toast } = useToast();
  const [userSkills, setUserSkills] = useState<string[]>(user.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

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

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    const trimmedSkill = newSkill.trim();
    
    // Check if skill already exists (case insensitive)
    if (userSkills.some(skill => skill.toLowerCase() === trimmedSkill.toLowerCase())) {
      toast({
        title: 'Skill already exists',
        description: 'This skill is already in your list.',
        variant: 'destructive',
      });
      return;
    }
    
    const updatedSkills = [...userSkills, trimmedSkill];
    setUserSkills(updatedSkills);
    updateSkillsMutation.mutate(updatedSkills);
    setNewSkill('');
    setIsAddingSkill(false);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (readOnly) return;
    
    const updatedSkills = userSkills.filter(skill => skill !== skillToRemove);
    setUserSkills(updatedSkills);
    updateSkillsMutation.mutate(updatedSkills);
  };

  const handleStartEdit = (skill: string) => {
    if (readOnly) return;
    setEditingSkill(skill);
    setEditValue(skill);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim() || !editingSkill) return;
    
    const trimmedValue = editValue.trim();
    
    // Check if the new value already exists (case insensitive) and is different from current
    if (trimmedValue.toLowerCase() !== editingSkill.toLowerCase() && 
        userSkills.some(skill => skill.toLowerCase() === trimmedValue.toLowerCase())) {
      toast({
        title: 'Skill already exists',
        description: 'This skill is already in your list.',
        variant: 'destructive',
      });
      return;
    }
    
    const updatedSkills = userSkills.map(skill => 
      skill === editingSkill ? trimmedValue : skill
    );
    
    setUserSkills(updatedSkills);
    updateSkillsMutation.mutate(updatedSkills);
    setEditingSkill(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingSkill(null);
    setEditValue('');
  };

  const handleVerifySkill = (skill: string, verified: boolean) => {
    if (readOnly) return;
    verifySkillMutation.mutate({ skill, verified });
  };

  const getSkillVerificationStatus = (skill: string) => {
    return user.skillsVerified?.[skill] || false;
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'add') {
        handleAddSkill();
      } else {
        handleSaveEdit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (action === 'add') {
        setIsAddingSkill(false);
        setNewSkill('');
      } else {
        handleCancelEdit();
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {userSkills.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No skills added yet</p>
        ) : (
          userSkills.map((skill) => (
            <div key={skill} className="relative group">
              {editingSkill === skill ? (
                // Edit mode
                <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-md px-2 py-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, 'edit')}
                    className="h-6 text-xs border-none p-0 focus-visible:ring-0 min-w-[80px]"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="text-green-600 hover:text-green-800 p-0.5"
                    aria-label="Save skill edit"
                  >
                    <Save className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-gray-700 p-0.5"
                    aria-label="Cancel skill edit"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                // Display mode
                <Badge 
                  variant={getSkillVerificationStatus(skill) ? "default" : "secondary"}
                  className="flex items-center gap-1 pr-1 group-hover:pr-8 transition-all duration-200"
                >
                  {skill}
                  {getSkillVerificationStatus(skill) && (
                    <Check className="h-3 w-3 ml-0.5 text-green-500" />
                  )}
                  {!readOnly && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-0.5">
                      <button
                        onClick={() => handleStartEdit(skill)}
                        className="text-blue-600 hover:text-blue-800 p-0.5 bg-white rounded-sm shadow-sm"
                        aria-label={`Edit ${skill} skill`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-red-600 hover:text-red-800 p-0.5 bg-white rounded-sm shadow-sm"
                        aria-label={`Remove ${skill} skill`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </Badge>
              )}
            </div>
          ))
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          {isAddingSkill ? (
            // Add skill input
            <div className="flex items-center gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, 'add')}
                placeholder="Enter a skill..."
                className="h-8 text-sm min-w-[150px]"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddSkill}
                disabled={!newSkill.trim() || updateSkillsMutation.isPending}
                className="h-8 px-2"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingSkill(false);
                  setNewSkill('');
                }}
                className="h-8 px-2"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            // Add skill button
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1" 
              disabled={updateSkillsMutation.isPending}
              onClick={() => setIsAddingSkill(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Add Skill
            </Button>
          )}

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

      {!readOnly && (
        <div className="text-xs text-gray-500 mt-2">
          <p>• Click the edit icon to modify a skill</p>
          <p>• Press Enter to save, Escape to cancel</p>
          <p>• Skills are case-sensitive and duplicates are not allowed</p>
        </div>
      )}
    </div>
  );
}