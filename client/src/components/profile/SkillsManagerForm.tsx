import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, PlusCircle, Save, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SkillsManagerFormProps {
  initialSkills?: string[];
  onSkillsChange: (skills: string[]) => void;
  showTitle?: boolean;
}

export function SkillsManagerForm({ 
  initialSkills = [], 
  onSkillsChange,
  showTitle = true 
}: SkillsManagerFormProps) {
  const { toast } = useToast();
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [newSkill, setNewSkill] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Update parent when skills change
  useEffect(() => {
    onSkillsChange(skills);
  }, [skills, onSkillsChange]);

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    const trimmedSkill = newSkill.trim();
    
    // Check if skill already exists (case insensitive)
    if (skills.some(skill => skill.toLowerCase() === trimmedSkill.toLowerCase())) {
      toast({
        title: 'Skill already exists',
        description: 'This skill is already in your list.',
        variant: 'destructive',
      });
      return;
    }
    
    setSkills([...skills, trimmedSkill]);
    setNewSkill('');
    setIsAddingSkill(false);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingSkill(false);
      setNewSkill('');
    }
  };

  return (
    <div className="space-y-3">
      {showTitle && (
        <h3 className="text-sm font-medium">Skills</h3>
      )}
      
      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No skills added yet</p>
        ) : (
          skills.map((skill) => (
            <Badge 
              key={skill}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {skill}
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="ml-1 text-gray-500 hover:text-gray-700"
                type="button"
                aria-label={`Remove ${skill} skill`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        {isAddingSkill ? (
          <div className="flex items-center gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter a skill..."
              className="h-8 text-sm min-w-[150px]"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddSkill}
              disabled={!newSkill.trim()}
              className="h-8 px-2"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              type="button"
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
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={() => setIsAddingSkill(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add Skill
          </Button>
        )}
      </div>
    </div>
  );
} 