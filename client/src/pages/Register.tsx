import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { SKILLS } from '@shared/schema';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional().default([]),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterProps {
  onModeChange: () => void;
}

export default function Register({ onModeChange }: RegisterProps) {
  const [_, navigate] = useLocation();
  const { registerMutation } = useAuth();

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
    // Remove confirmPassword as it's not part of our API schema
    const { confirmPassword, ...userData } = data;
    
    registerMutation.mutate(userData, {
      onSuccess: () => {
        navigate('/');
      }
    });
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center">
          <img 
            src="/src/assets/logo-white.svg" 
            alt="Fixer" 
            className="h-16 w-auto" 
          />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Sign up for Fixer to start finding or posting gigs</CardDescription>
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
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Skills</FormLabel>
                      <FormDescription>
                        Select the skills you have to match with relevant jobs
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {SKILLS.map((skill) => (
                        <FormField
                          key={skill}
                          control={form.control}
                          name="skills"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={skill}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(skill)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, skill])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== skill
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {skill}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
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
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <span 
              className="font-medium text-primary-600 hover:text-primary-500 cursor-pointer"
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
