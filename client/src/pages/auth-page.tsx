import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { MapPinned, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Login from './Login';
import Register from './Register';
import { Badge } from '@/components/ui/badge';

const LoginWithMode = (props: any) => <Login onModeChange={props.onModeChange} />;
const RegisterWithMode = (props: any) => <Register onModeChange={props.onModeChange} />;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1500px] gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.9fr)]">
        <div className="surface-strong flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-2xl">
            {mode === 'login' ? (
              <LoginWithMode onModeChange={() => setMode('register')} />
            ) : (
              <RegisterWithMode onModeChange={() => setMode('login')} />
            )}
          </div>
        </div>

        <div className="surface-strong hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div>
            <Badge variant="outline" className="w-fit bg-background/70">
              Fixer platform
            </Badge>
            <h1 className="hero-gradient-text mt-4 text-5xl font-semibold tracking-tight">
              A better home for local jobs, side hustles, and reliable hiring.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              The new experience is built around clarity. Workers discover nearby opportunities faster, and posters get
              a calmer workflow for posting, paying, and staying on top of job movement.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/70 bg-white/76 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/68">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
                  <MapPinned className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-['Sora'] text-xl font-semibold tracking-tight text-foreground">
                  Smart location matching
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Search by neighborhood, city, or description and stay grounded in the live map while you browse.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/76 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/68">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-['Sora'] text-xl font-semibold tracking-tight text-foreground">
                  Cleaner trust signals
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Profiles, reviews, and job status surfaces are easier to scan so users can make decisions more
                  confidently.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[30px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  <Sparkles className="h-3.5 w-3.5" />
                  What improves
                </div>
                <ul className="mt-5 space-y-4 text-sm leading-6 text-white/78">
                  <li>Map-first browsing that still keeps a strong list and search flow visible.</li>
                  <li>Posting and payment areas designed to feel structured instead of overwhelming.</li>
                  <li>Responsive layouts that stay comfortable to use in a phone browser or on a desktop.</li>
                </ul>
              </div>

              <div className="rounded-[30px] border border-white/70 bg-[linear-gradient(160deg,rgba(2,132,199,0.12),rgba(251,146,60,0.10))] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/80 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.08)] dark:bg-slate-950/70">
                  <Wallet className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-['Sora'] text-xl font-semibold tracking-tight text-foreground">
                  Payments and payouts
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Payment setup, payment history, and transfer steps now live within the same cleaner visual system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
