import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { BellRing, Compass, Plus, UserRound, Wallet } from 'lucide-react';

interface MobileNavProps {
  selectedTab?: 'worker' | 'poster';
  onTabChange?: (tab: string) => void;
}

const MobileNav: React.FC<MobileNavProps> = () => {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const items = [
    { href: '/', label: 'Discover', icon: Compass },
    { href: '/post-job', label: 'Post', icon: Plus },
    { href: '/payments', label: 'Wallet', icon: Wallet },
    { href: '/notifications', label: 'Alerts', icon: BellRing },
    { href: `/profile/${user.id}`, label: 'Profile', icon: UserRound },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }

    if (href.startsWith('/profile/')) {
      return location.startsWith('/profile/');
    }

    return location.startsWith(href);
  };

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-[var(--z-navigation)] md:hidden">
      <div className="rounded-[28px] border border-white/70 bg-white/88 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88">
        <div className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={[
                    'flex flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2.5 text-[11px] font-semibold transition-all',
                    active
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-primary-foreground shadow-[0_12px_28px_rgba(3,105,161,0.24)]'
                      : 'text-foreground/62 hover:bg-foreground/[0.04] hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;
