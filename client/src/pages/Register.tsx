import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { SkillsManagerForm } from '@/components/profile/SkillsManagerForm';
import logoImg from '@/assets/fixer.png';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterProps {
  onModeChange: () => void;
  accountType?: 'worker' | 'poster' | 'enterprise';
}

export default function Register({ onModeChange, accountType = 'worker' }: RegisterProps) {
  const [_] = useLocation();
  const { registerMutation } = useAuth();
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema.refine(
      data => data.password === data.confirmPassword,
      {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }
    )),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      email: '',
      phone: '',
      bio: '',
      skills: [],
    },
  });

  async function onSubmit(data: FormData) {
    try {
      // Remove confirmPassword as it's not part of our API schema
      const { confirmPassword, ...userData } = data;
      
      // Ensure all required fields are present for cross-browser compatibility
      const submitData = {
        ...userData,
        phone: userData.phone || '', // Ensure phone is never undefined
        bio: userData.bio || '', // Ensure bio is never undefined
        skills: userData.skills || [], // Ensure skills is never undefined
        accountType: accountType, // Use the passed accountType
      };
      
      registerMutation.mutate(submitData, {
        onSuccess: () => {
          // Navigation is now handled in the mutation's onSuccess in use-auth.tsx
          // This ensures the session is properly established first
          setShowSuggestions(false);
          setUsernameSuggestions([]);
        },
        onError: (error: any) => {
          console.error('Registration error:', error);

          // Handle username suggestions
          if (error.suggestions && error.suggestions.length > 0) {
            setUsernameSuggestions(error.suggestions);
            setShowSuggestions(true);
          } else {
            setShowSuggestions(false);
            setUsernameSuggestions([]);
          }
        }
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center">
          <div className="bg-muted p-5 rounded-xl shadow-sm">
            <img 
              src={logoImg} 
              alt="Fixer" 
              className="h-28 w-auto" 
            />
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create {accountType === 'enterprise' ? 'Business' : 'an'} Account</CardTitle>
          <CardDescription>
            {accountType === 'enterprise' 
              ? 'Sign up for Fixer Business to scale your hiring'
              : 'Sign up for Fixer to start finding or posting gigs'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} />
                      </FormControl>
                      <FormMessage />
                      {showSuggestions && usernameSuggestions.length > 0 && (
                        <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
                          <p className="text-sm text-primary font-medium mb-2">
                            Try these available usernames:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {usernameSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  field.onChange(suggestion);
                                  setShowSuggestions(false);
                                  setUsernameSuggestions([]);
                                }}
                                className="px-3 py-1 text-sm bg-primary/20 hover:bg-primary/30 text-primary rounded-full transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {accountType === 'enterprise' || accountType === 'poster' 
                          ? 'Business Name' 
                          : 'Full Name'
                        }
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={
                            accountType === 'enterprise' || accountType === 'poster'
                              ? "Acme Corporation"
                              : "John Doe"
                          } 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us a bit about yourself..." 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Skills</FormLabel>
                      <FormDescription>
                        Add skills you have to match with relevant jobs. You can add custom skills or select from suggestions.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <SkillsManagerForm
                        initialSkills={field.value || []}
                        onSkillsChange={(skills) => field.onChange(skills)}
                        showTitle={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>



        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <span
              className="font-medium text-primary hover:text-primary/80 cursor-pointer"
              onClick={onModeChange}
            >
              Log in
            </span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
