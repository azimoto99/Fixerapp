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
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme';
import { NotificationPopover } from '@/components/notifications';
import UserDrawerV2 from '@/components/UserDrawerV2';

const Header = () => {
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
              <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-emerald-600">Fixer</span>
            </div>
          </Link>
          
          {/* Desktop navigation - hidden on mobile */}
          <nav className="hidden md:ml-8 md:flex md:space-x-8">
            {/* Links for all users */}
            <NavLink href="/" isActive={location === '/'}>
              {user?.accountType === 'worker' ? 'Find Jobs' : 'Browse Workers'}
            </NavLink>
            
            {/* Post Job link - available to all authenticated users */}
            {user && (
              <NavLink href="/post-job" isActive={location === '/post-job'}>
                Post a Job
              </NavLink>
            )}
            
            {/* Links for workers only */}
            {user?.accountType === 'worker' && (
              <NavLink href="/applications" isActive={location === '/applications'}>
                My Applications
              </NavLink>
            )}
            
            {/* Links for authenticated users */}
            {user && (
              <>
                <NavLink 
                  href={user.accountType === 'poster' ? '/my-jobs' : '/saved-jobs'} 
                  isActive={location === (user.accountType === 'poster' ? '/my-jobs' : '/saved-jobs')}
                >
                  {user.accountType === 'poster' ? 'My Jobs' : 'Saved Jobs'}
                </NavLink>
                <NavLink href="/messages" isActive={location === '/messages'}>
                  Messages
                </NavLink>
              </>
            )}
          </nav>
        </div>
        
        {/* Right side elements */}
        <div className="flex items-center space-x-4">
          {user && <NotificationPopover className="hidden md:flex" />}
          
          {/* Post Job+ Button - Hidden on small mobile */}
          <Link href="/post-job" className="hidden sm:block">
            <div className="flex text-white bg-emerald-600 hover:bg-emerald-700 font-medium py-2 px-4 rounded-md shadow-md transition-all hover:shadow-lg transform hover:-translate-y-0.5">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Post Job+</span>
              </span>
            </div>
          </Link>
          
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open mobile menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="py-6 px-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                    <span className="ml-2 text-xl font-bold text-emerald-600">Fixer</span>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-5 w-5" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </div>

                {/* User info if logged in */}
                {user && (
                  <div className="flex items-center mb-6 pb-4 border-b">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                      <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="ml-3">
                      <h3 className="font-medium">{user.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{user.accountType === 'worker' ? 'Worker' : 'Job Poster'}</p>
                    </div>
                  </div>
                )}

                {/* Mobile navigation links */}
                <nav className="flex flex-col space-y-4">
                  <NavLink href="/" isActive={location === '/'}>
                    {user?.accountType === 'worker' ? 'Find Jobs' : 'Browse Workers'}
                  </NavLink>
                  
                  {user && (
                    <NavLink href="/post-job" isActive={location === '/post-job'}>
                      Post a Job
                    </NavLink>
                  )}
                  
                  {user?.accountType === 'worker' && (
                    <NavLink href="/applications" isActive={location === '/applications'}>
                      My Applications
                    </NavLink>
                  )}
                  
                  {user && (
                    <>
                      <NavLink 
                        href={user.accountType === 'poster' ? '/my-jobs' : '/saved-jobs'} 
                        isActive={location === (user.accountType === 'poster' ? '/my-jobs' : '/saved-jobs')}
                      >
                        {user.accountType === 'poster' ? 'My Jobs' : 'Saved Jobs'}
                      </NavLink>
                      <NavLink href="/messages" isActive={location === '/messages'}>
                        Messages
                      </NavLink>
                      <NavLink href="/payments" isActive={location === '/payments'}>
                        Payments
                      </NavLink>
                      <NavLink href="/notifications" isActive={location === '/notifications'}>
                        Notifications
                      </NavLink>
                    </>
                  )}
                  
                  {user ? (
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={handleLogout}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-4">
                      <Link href="/login">
                        <Button className="w-full">Login</Button>
                      </Link>
                      <Link href="/register">
                        <Button variant="outline" className="w-full mt-2">Register</Button>
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* User account section */}
          {user ? (
            <div className="hidden md:block cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              // The drawer is triggered by this click wrapper
            }}>
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
              <div className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer">Login</div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
