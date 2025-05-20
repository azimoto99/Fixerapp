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
      <div className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-3 cursor-pointer transition-colors ${isActive ? 'text-emerald-600 font-semibold' : ''}`}>
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
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 512 512" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-auto"
              >
                <circle cx="256" cy="256" r="240" fill="#10B981"/>
                <path d="M323 160C290 160 263 187 263 220C263 226 264 231 265 236L176 325C171 324 166 323 160 323C127 323 100 350 100 383C100 416 127 443 160 443C193 443 220 416 220 383C220 377 219 372 218 367L307 278C312 279 317 280 323 280C356 280 383 253 383 220C383 187 356 160 323 160Z" fill="white"/>
                <circle cx="323" cy="220" r="25" fill="#10B981"/>
                <circle cx="160" cy="383" r="25" fill="#10B981"/>
              </svg>
              <span className="ml-2 text-xl font-bold text-emerald-600">Fixer</span>
            </div>
          </Link>
          
          {/* Desktop navigation links removed */}
        </div>
        
        {/* Right side elements */}
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            {user && <NotificationPopover />}
          </div>
          
          {/* Messaging Button - placed to the left of Posted Jobs button */}
          {user && onToggleMessaging && (
            <div>
              <Button 
                onClick={onToggleMessaging}
                className="bg-emerald-600 text-white shadow hover:bg-emerald-700 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2 md:p-2"
                aria-label="Messages"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="ml-1 hidden md:inline">Messages</span>
              </Button>
            </div>
          )}
          
          {/* Posted Jobs Button - always visible when user is logged in */}
          {user && onTogglePostedJobs && (
            <div className="relative">
              <Button 
                onClick={onTogglePostedJobs}
                className="bg-blue-600 text-white shadow hover:bg-blue-700 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 p-2 md:p-2"
                aria-label="My Posted Jobs"
              >
                <Briefcase className="h-5 w-5" />
                <span className="ml-1 hidden md:inline">My Jobs</span>
              </Button>
              {postedJobsCount > 0 && (
                <div className="absolute -top-1 -right-1 z-10 pointer-events-none">
                  <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {postedJobsCount}
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
                <button className="flex items-center text-sm rounded-full focus:outline-none">
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
