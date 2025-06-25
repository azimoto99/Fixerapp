import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import logoImg from '@/assets/fixer.png';
import { Building2, MapPin, Globe, Phone, Mail, Upload, CheckCircle } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Extended schema for business registration
const businessFormSchema = z.object({
  // Basic user info
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  
  // Business-specific fields
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters'),
  businessDescription: z.string()
    .min(10, 'Business description must be at least 10 characters')
    .max(500, 'Business description must be less than 500 characters'),
  businessType: z.enum(['company', 'startup', 'non_profit', 'government', 'agency', 'freelancer']),
  businessWebsite: z.string().url('Invalid website URL').optional().or(z.literal('')),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email('Invalid business email').optional().or(z.literal('')),
  businessLocation: z.string()
    .min(2, 'Business location is required')
    .max(200, 'Business location must be less than 200 characters'),
  
  // Enterprise features interest
  estimatedHires: z.enum(['1-5', '6-20', '21-50', '50+']),
  primaryIndustry: z.string().min(1, 'Please select your primary industry'),
});

type BusinessFormData = z.infer<typeof businessFormSchema>;

interface BusinessRegisterProps {
  onModeChange?: () => void;
}

const businessTypes = [
  { value: 'company', label: 'Corporation/LLC' },
  { value: 'startup', label: 'Startup' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'government', label: 'Government' },
  { value: 'agency', label: 'Staffing Agency' },
  { value: 'freelancer', label: 'Independent Contractor' },
];

const industries = [
  'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
  'Construction', 'Education', 'Real Estate', 'Food & Beverage',
  'Transportation', 'Marketing', 'Consulting', 'Legal', 'Other'
];

const enterpriseFeatures = [
  {
    icon: Building2,
    title: 'Featured Hub Pins',
    description: 'Stand out on the map with premium business locations'
  },
  {
    icon: CheckCircle,
    title: 'Advanced Analytics',
    description: 'Track hiring metrics and workforce insights'
  },
  {
    icon: MapPin,
    title: 'Multiple Locations',
    description: 'Manage positions across different business locations'
  },
  {
    icon: Globe,
    title: 'Team Management',
    description: 'Add team members and manage hiring permissions'
  }
];

export default function BusinessRegister({ onModeChange }: BusinessRegisterProps) {
  const [_] = useLocation();
  const { registerMutation } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema.refine(
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
      businessName: '',
      businessDescription: '',
      businessType: 'company',
      businessWebsite: '',
      businessPhone: '',
      businessEmail: '',
      businessLocation: '',
      estimatedHires: '1-5',
      primaryIndustry: '',
    },
  });

  async function onSubmit(data: BusinessFormData) {
    try {
      const { confirmPassword, ...userData } = data;
      
      const submitData = {
        ...userData,
        phone: userData.phone || '',
        businessWebsite: userData.businessWebsite || '',
        businessPhone: userData.businessPhone || '',
        businessEmail: userData.businessEmail || '',
        accountType: 'enterprise' as const,
        skills: [], // Business accounts don't need individual skills
        bio: `${userData.businessDescription}`, // Use business description as bio
      };
      
      registerMutation.mutate(submitData, {
        onSuccess: () => {
          setShowSuggestions(false);
          setUsernameSuggestions([]);
        },
        onError: (error: any) => {
          console.error('Business registration error:', error);
          
          if (error.suggestions && error.suggestions.length > 0) {
            setUsernameSuggestions(error.suggestions);
            setShowSuggestions(true);
            setCurrentStep(1); // Go back to first step for username fix
          }
        }
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = currentStep === 1 
      ? ['username', 'password', 'confirmPassword', 'fullName', 'email']
      : ['businessName', 'businessDescription', 'businessType', 'businessLocation', 'primaryIndustry'];
    
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <img 
                src={logoImg} 
                alt="Fixer" 
                className="h-20 w-auto" 
              />
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Account Info</span>
            </div>
            <div className={`w-16 h-px ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Business Details</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Create Business Account
                </CardTitle>
                <CardDescription>
                  {currentStep === 1 
                    ? 'Set up your account credentials and contact information'
                    : 'Tell us about your business and hiring needs'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Step 1: Account Info */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="your-business" {...field} />
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
                                <FormLabel>Your Full Name</FormLabel>
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
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@company.com" {...field} />
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
                      </div>
                    )}

                    {/* Step 2: Business Details */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Acme Corporation" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="businessDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe your business, what you do, and what types of positions you typically hire for..."
                                  className="resize-none"
                                  rows={4}
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                This will help workers understand your business and the opportunities you offer.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="businessType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select business type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {businessTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="primaryIndustry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Industry</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {industries.map((industry) => (
                                      <SelectItem key={industry} value={industry}>
                                        {industry}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="businessLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Location</FormLabel>
                              <FormControl>
                                <Input placeholder="New York, NY" {...field} />
                              </FormControl>
                              <FormDescription>
                                Primary location where you hire workers
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="businessWebsite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://yourcompany.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="estimatedHires"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Expected Hires per Month</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select range" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1-5">1-5 hires</SelectItem>
                                    <SelectItem value="6-20">6-20 hires</SelectItem>
                                    <SelectItem value="21-50">21-50 hires</SelectItem>
                                    <SelectItem value="50+">50+ hires</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="businessPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Phone (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="businessEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Email (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="contact@company.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6">
                      {currentStep === 1 ? (
                        <Button variant="outline" onClick={onModeChange} type="button">
                          Back to Login
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={prevStep} type="button">
                          Previous
                        </Button>
                      )}
                      
                      {currentStep === 1 ? (
                        <Button onClick={nextStep} type="button">
                          Next
                        </Button>
                      ) : (
                        <Button type="submit" disabled={registerMutation.isPending}>
                          {registerMutation.isPending ? 'Creating Account...' : 'Create Business Account'}
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Features Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-xl">Enterprise Features</CardTitle>
                <CardDescription>
                  What you get with a Fixer Business account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enterpriseFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  <Badge variant="secondary" className="w-full justify-center">
                    ✨ Premium Features Included
                  </Badge>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
