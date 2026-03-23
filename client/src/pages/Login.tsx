import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@/lib/zod-resolver';
import { useAuth } from '@/hooks/use-auth';
import logoImg from '@/assets/logo.png';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof formSchema>;

interface LoginProps {
  onModeChange: () => void;
}

export default function Login({ onModeChange }: LoginProps) {
  const { loginMutation } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: FormData) {
    loginMutation.mutate(data);
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
            <img src={logoImg} alt="Fixer" className="h-24 w-auto" />
          </div>
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Welcome back</p>
        <h1 className="mt-3 font-['Sora'] text-3xl font-semibold tracking-tight text-foreground">
          Pick up where you left off.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in to browse nearby jobs, manage applications, or keep your hiring flow moving.
        </p>
      </div>

      <Card className="surface-panel">
        <CardHeader>
          <CardTitle>Log In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <span className="cursor-pointer font-semibold text-primary" onClick={onModeChange}>
              Sign up
            </span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
