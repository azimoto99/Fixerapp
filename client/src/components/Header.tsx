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
import UserDrawerV2 from '@/components/UserDrawerV2';

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
              <div className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 cursor-pointer ${location === '/' ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>
                {user?.accountType === 'worker' ? 'Find Jobs' : 'Browse Workers'}
              </div>
            </Link>
            
            {/* Post Job link - available to all authenticated users */}
            {user && (
              <Link href="/post-job">
                <div className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 cursor-pointer ${location === '/post-job' ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>
                  Post a Job
                </div>
              </Link>
            )}
            
            {/* Links for workers only */}
            {user?.accountType === 'worker' && (
              <Link href="/applications">
                <div className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 cursor-pointer ${location === '/applications' ? 'text-emerald-600 border-b-2 border-emerald-600' : ''}`}>
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
          {/* Show post job button for all users (even non-logged in) in the header */}
          <Link href="/post-job">
            <div className="hidden md:flex text-white bg-emerald-600 hover:bg-emerald-700 font-medium py-2 px-4 rounded-md">
              Post a Job
            </div>
          </Link>
          
          {user && <NotificationPopover className="hidden md:flex" />}
          {user ? (
            <div className="cursor-pointer" onClick={(e) => {
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
