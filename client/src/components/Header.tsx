import * as React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme';
import { NotificationPopover } from '@/components/notifications';
import UserDrawerV2 from '@/components/UserDrawerV2';
import {
  BellRing,
  BriefcaseBusiness,
  Compass,
  MessageSquareMore,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';

interface HeaderProps {
  selectedRole?: 'worker' | 'poster';
  onRoleChange?: (role: 'worker' | 'poster') => void;
  onTogglePostedJobs?: () => void;
  onToggleMessaging?: () => void;
  postedJobsCount?: number;
}

const Header: React.FC<HeaderProps> = ({
  selectedRole,
  onRoleChange,
  onTogglePostedJobs,
  onToggleMessaging,
  postedJobsCount = 0,
}) => {
  const { user } = useAuth();
  const [location] = useLocation();

  const profileHref = user?.id ? `/profile/${user.id}` : '/auth';

  const navigation = [
    { href: '/', label: 'Discover', icon: Compass },
    { href: '/post-job', label: 'Post Job', icon: Plus },
    { href: '/payments', label: 'Payments', icon: Wallet },
    { href: '/notifications', label: 'Updates', icon: BellRing },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location === '/';
    }

    return location.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-[var(--z-header)] px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[32px] border border-white/70 bg-white/78 shadow-[0_22px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/78">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/">
                <button className="group flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all hover:translate-y-[-1px] hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/72">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_30px_rgba(3,105,161,0.26)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Local work platform
                    </div>
                    <div className="font-['Sora'] text-lg font-semibold tracking-tight text-foreground">
                      Fixer
                    </div>
                  </div>
                </button>
              </Link>

              <nav className="hidden items-center gap-2 lg:flex">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.href);

                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={[
                          'flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all',
                          active
                            ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_28px_rgba(3,105,161,0.22)]'
                            : 'bg-transparent text-foreground/70 hover:bg-foreground/5 hover:text-foreground',
                        ].join(' ')}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {user && onToggleMessaging ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex"
                  onClick={onToggleMessaging}
                >
                  <MessageSquareMore className="h-4 w-4" />
                  Messages
                </Button>
              ) : null}

              {user && onTogglePostedJobs ? (
                <div className="relative hidden md:block">
                  <Button variant="secondary" size="sm" onClick={onTogglePostedJobs}>
                    <BriefcaseBusiness className="h-4 w-4" />
                    My Jobs
                  </Button>
                  {postedJobsCount > 0 ? (
                    <Badge
                      variant="destructive"
                      size="sm"
                      className="absolute -right-2 -top-2 min-w-[1.35rem] justify-center px-1.5"
                    >
                      {postedJobsCount}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              {user ? <NotificationPopover /> : null}

              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {user ? (
                <UserDrawerV2>
                  <button className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-2 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-all hover:border-primary/20 hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/72">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                      <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left md:block">
                      <div className="text-sm font-semibold text-foreground">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.accountType === 'poster' ? 'Hiring mode' : 'Worker mode'}
                      </div>
                    </div>
                  </button>
                </UserDrawerV2>
              ) : (
                <Link href="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto lg:hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={[
                      'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-all',
                      active
                        ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_10px_24px_rgba(3,105,161,0.20)]'
                        : 'bg-foreground/[0.04] text-foreground/75',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}

            {user && onToggleMessaging ? (
              <Button variant="ghost" size="sm" className="shrink-0" onClick={onToggleMessaging}>
                <MessageSquareMore className="h-4 w-4" />
                Messages
              </Button>
            ) : null}

            {user && onTogglePostedJobs ? (
              <div className="relative shrink-0">
                <Button variant="ghost" size="sm" onClick={onTogglePostedJobs}>
                  <BriefcaseBusiness className="h-4 w-4" />
                  Jobs
                </Button>
                {postedJobsCount > 0 ? (
                  <Badge
                    variant="destructive"
                    size="sm"
                    className="absolute -right-2 -top-2 min-w-[1.35rem] justify-center px-1.5"
                  >
                    {postedJobsCount}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          {selectedRole && onRoleChange ? (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Dashboard mode
                </div>
                <div className="mt-1 text-sm text-foreground/75">
                  Switch between finding nearby gigs and managing posted jobs.
                </div>
              </div>

              <div className="inline-flex rounded-full border border-white/70 bg-white/80 p-1.5 shadow-[0_10px_25px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/70">
                <button
                  onClick={() => onRoleChange('worker')}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                    selectedRole === 'worker'
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_28px_rgba(3,105,161,0.20)]'
                      : 'text-foreground/70 hover:text-foreground',
                  ].join(' ')}
                >
                  Worker
                </button>
                <button
                  onClick={() => onRoleChange('poster')}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                    selectedRole === 'poster'
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_28px_rgba(3,105,161,0.20)]'
                      : 'text-foreground/70 hover:text-foreground',
                  ].join(' ')}
                >
                  Poster
                </button>
              </div>
            </div>
          ) : user ? (
            <div className="hidden items-center justify-between border-t border-border/70 pt-4 md:flex">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Signed in as {user.username}</Badge>
                <Badge variant="secondary">
                  {user.accountType === 'poster' ? 'Posting jobs' : 'Ready to work'}
                </Badge>
              </div>
              <Link href={profileHref}>
                <Button variant="ghost" size="sm">
                  View profile
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
