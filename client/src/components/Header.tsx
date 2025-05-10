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
import logoImg from '@/assets/logo.png';

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
              <img src={logoImg} alt="Fixer Logo" className="h-10 w-auto" />
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
          {user && <NotificationPopover className="hidden md:flex" />}
          
          {/* Post Job+ Button - Between Notification and User Drawer */}
          <Link href="/post-job">
            <div className="flex text-white bg-emerald-600 hover:bg-emerald-700 font-medium py-2 px-4 rounded-md shadow-md transition-all hover:shadow-lg transform hover:-translate-y-0.5">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Post Job+
              </span>
            </div>
          </Link>
          
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
