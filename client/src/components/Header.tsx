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
import { ThemeToggle } from '@/components/theme';
import { NotificationPopover } from '@/components/notifications';

const Header = () => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-background shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center">
          <Link href="/">
            <div className="flex-shrink-0 flex items-center cursor-pointer">
              <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-emerald-600">Fixer</span>
            </div>
          </Link>
          <nav className="hidden md:ml-8 md:flex md:space-x-8">
            {/* Links for all users */}
            <Link href="/">
              <div className={`text-gray-300 hover:text-gray-100 font-medium px-1 py-5 cursor-pointer ${location === '/' ? 'text-emerald-500 border-b-2 border-emerald-500' : ''}`}>
                {user?.accountType === 'worker' ? 'Find Jobs' : 'Browse Workers'}
              </div>
            </Link>
            
            {/* Links for posters only */}
            {(!user || user.accountType === 'poster') && (
              <Link href="/post-job">
                <div className={`text-gray-300 hover:text-gray-100 font-medium px-1 py-5 cursor-pointer ${location === '/post-job' ? 'text-emerald-500 border-b-2 border-emerald-500' : ''}`}>
                  Post a Job
                </div>
              </Link>
            )}
            
            {/* Links for workers only */}
            {user?.accountType === 'worker' && (
              <Link href="/applications">
                <div className={`text-gray-300 hover:text-gray-100 font-medium px-1 py-5 cursor-pointer ${location === '/applications' ? 'text-emerald-500 border-b-2 border-emerald-500' : ''}`}>
                  My Applications
                </div>
              </Link>
            )}
            
            {/* Links for authenticated users */}
            {user && (
              <>
                <Link href={user.accountType === 'poster' ? '/my-jobs' : '/saved-jobs'}>
                  <div className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 cursor-pointer ${location === (user.accountType === 'poster' ? '/my-jobs' : '/saved-jobs') ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>
                    {user.accountType === 'poster' ? 'My Jobs' : 'Saved Jobs'}
                  </div>
                </Link>
                <Link href="/messages">
                  <div className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 cursor-pointer ${location === '/messages' ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>
                    Messages
                  </div>
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {user && <NotificationPopover className="hidden md:flex" />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-sm rounded-full focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName} />
                    <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block ml-2 text-sm font-medium text-gray-700">{user.fullName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href="/profile">
                    <span className="cursor-pointer w-full">Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/notifications">
                    <span className="cursor-pointer w-full">Notifications</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Settings</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                    <div className="p-2 w-56">
                      <ThemeToggle variant="compact" />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/settings">
                        <span className="cursor-pointer w-full">All Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <div className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer">Login</div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
