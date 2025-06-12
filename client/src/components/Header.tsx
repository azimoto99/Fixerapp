import * as React from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X, Briefcase, MessageSquare } from 'lucide-react';
import { ThemeToggle } from '@/components/theme';
import { NotificationPopover } from '@/components/notifications';
import UserDrawerV2 from '@/components/UserDrawerV2';
import fixerLogo from '@/assets/fixer.png';

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
  postedJobsCount = 0
}) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Create a reusable navigation link component for consistency
  const NavLink = ({ href, isActive, children }: { href: string; isActive: boolean; children: React.ReactNode }) => (
    <Link href={href}>
      <div className={`text-muted-foreground hover:text-foreground font-medium px-1 py-3 cursor-pointer transition-colors ${isActive ? 'text-primary font-semibold' : ''}`}>
        {children}
      </div>
    </Link>
  );

  return (
    <header className="bg-background shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* Logo and desktop navigation */}
        <div className="flex items-center">
          <Link href="/">
            <div className="flex-shrink-0 flex items-center cursor-pointer">
              <img src={fixerLogo} alt="Fixer" className="h-10 w-10 rounded-full" />
              <span className="ml-2 text-xl font-bold text-primary">Fixer</span>
            </div>
          </Link>
          
          {/* Desktop navigation links removed */}
        </div>
        
        {/* Right side elements */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notifications - now visible on mobile */}
          {user && (
            <div className="relative">
              <NotificationPopover />
            </div>
          )}
          
          {/* Messaging Button - compact on mobile */}
          {user && onToggleMessaging && (
            <div>
              <Button
                onClick={onToggleMessaging}
                size="sm"
                className="bg-primary text-primary-foreground shadow hover:bg-primary/90 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2"
                aria-label="Messages"
              >
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                <span className="ml-1 hidden lg:inline text-sm">Messages</span>
              </Button>
            </div>
          )}

          {/* Posted Jobs Button - compact on mobile */}
          {user && onTogglePostedJobs && (
            <div className="relative">
              <Button
                onClick={onTogglePostedJobs}
                size="sm"
                className="bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2"
                aria-label="My Posted Jobs"
              >
                <Briefcase className="h-4 w-4 md:h-5 md:w-5" />
                <span className="ml-1 hidden lg:inline text-sm">My Jobs</span>
              </Button>
              {postedJobsCount > 0 && (
                <div className="absolute -top-1 -right-1 z-10 pointer-events-none">
                  <span className="bg-destructive text-destructive-foreground rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-xs">
                    {postedJobsCount > 9 ? '9+' : postedJobsCount}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Mobile menu button - now uses UserDrawerV2 */}
          {user ? (
            <div className="md:hidden">
              <UserDrawerV2>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </UserDrawerV2>
            </div>
          ) : (
            <Link href="/login" className="md:hidden">
              <Button size="sm" variant="default">Login</Button>
            </Link>
          )}
          
          {/* User account section - using UserDrawerV2 */}
          {user ? (
            <div className="hidden md:block">
              <UserDrawerV2>
                <button className="flex items-center text-sm rounded-full focus:outline-none text-foreground">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                    <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block ml-2 text-sm font-medium">{user.fullName}</span>
                </button>
              </UserDrawerV2>
            </div>
          ) : (
            <Link href="/login" className="hidden md:block">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
