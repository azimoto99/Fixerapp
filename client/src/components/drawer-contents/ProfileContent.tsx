import React, { useState } from 'react';
import { User } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Phone, Mail, MapPin, Briefcase, Clock, Save } from 'lucide-react';
import { StripeConnectSetup } from '@/components/stripe';

interface ProfileContentProps {
  user: User;
}

const ProfileContent: React.FC<ProfileContentProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    phone: user.phone || '',
    bio: user.bio || '',
    skills: user.skills ? user.skills.join(', ') : ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest('PATCH', `/api/users/${user.id}`, {
        fullName: formData.fullName,
        phone: formData.phone || null,
        bio: formData.bio || null,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()) : null
      });

      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated'
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'There was a problem updating your profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format lastActive date if it exists, otherwise use current date
  const lastActive = user.lastActive 
    ? new Date(user.lastActive).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b">
        <h2 className="text-sm font-medium text-muted-foreground">Profile Information</h2>
        <Button 
          variant={isEditing ? "ghost" : "ghost"}
          onClick={() => setIsEditing(!isEditing)}
          size="sm"
          className="h-8 px-2 text-xs"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs">Full Name</Label>
            <Input 
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Phone Number</Label>
            <Input 
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Your phone number"
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs">Bio</Label>
            <Textarea 
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              rows={3}
              className="text-sm min-h-[70px]"
            />
          </div>
          
          {user.accountType === 'worker' && (
            <div className="space-y-1.5">
              <Label htmlFor="skills" className="text-xs">Skills (comma separated)</Label>
              <Input 
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g. Delivery, Cleaning, Lawn Care"
                className="h-8 text-sm"
              />
            </div>
          )}
          
          <div className="flex justify-end pt-1">
            <Button 
              type="submit" 
              disabled={isLoading}
              size="sm"
              className="h-8"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-1.5">⏳</span>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 bg-card border rounded-lg p-3">
            <Avatar className="h-12 w-12 border border-primary/10">
              <AvatarImage src={user.avatarUrl || ''} alt={user.fullName} />
              <AvatarFallback className="bg-primary/5 text-primary">
                {user.fullName.split(' ').map(part => part[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-medium text-base">{user.fullName}</h3>
              <div className="flex flex-wrap gap-1.5 items-center mt-0.5">
                <Badge variant="outline" className="capitalize text-xs px-1.5">{user.accountType}</Badge>
                {user.accountType === 'worker' && (
                  <Badge variant="secondary" className="text-xs px-1.5">ID: {user.id}</Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center">
                  <UserPlus className="h-3 w-3 mr-1 text-muted-foreground/60" />
                  Member since {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="border-b px-3 py-2">
              <h3 className="text-sm font-medium">Contact Information</h3>
            </div>
            <div className="p-3 space-y-2 text-sm">
              <div className="flex items-center">
                <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center">
                  <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>
          </div>
          
          {user.bio && (
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b px-3 py-2">
                <h3 className="text-sm font-medium">About</h3>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground">{user.bio}</p>
              </div>
            </div>
          )}
          
          {user.accountType === 'worker' && user.skills && user.skills.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b px-3 py-2">
                <h3 className="text-sm font-medium">Skills</h3>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {user.accountType === 'worker' && (
            <StripeConnectSetup compact={true} />
          )}
          
          <div className="border rounded-lg overflow-hidden">
            <div className="border-b px-3 py-2">
              <h3 className="text-sm font-medium">Account Activity</h3>
            </div>
            <div className="p-3">
              <div className="flex items-center">
                <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <span className="text-xs">Last active: {lastActive}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileContent;