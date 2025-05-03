import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center">
          <Link href="/">
            <a className="flex-shrink-0 flex items-center">
              <svg className="h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-primary-600">GigConnect</span>
            </a>
          </Link>
          <nav className="hidden md:ml-8 md:flex md:space-x-8">
            <Link href="/">
              <a className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 ${location === '/' ? 'text-primary-600 border-b-2 border-primary-600' : ''}`}>
                Find Jobs
              </a>
            </Link>
            <Link href="/post-job">
              <a className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 ${location === '/post-job' ? 'text-primary-600 border-b-2 border-primary-600' : ''}`}>
                Post a Job
              </a>
            </Link>
            <Link href="/my-jobs">
              <a className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 ${location === '/my-jobs' ? 'text-primary-600 border-b-2 border-primary-600' : ''}`}>
                My Jobs
              </a>
            </Link>
            <Link href="/messages">
              <a className={`text-gray-500 hover:text-gray-900 font-medium px-1 py-5 ${location === '/messages' ? 'text-primary-600 border-b-2 border-primary-600' : ''}`}>
                Messages
              </a>
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button type="button" className="hidden md:block bg-gray-100 p-1.5 rounded-full text-gray-500 hover:text-gray-600">
            <i className="ri-notification-3-line text-xl"></i>
          </button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-sm rounded-full focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block ml-2 text-sm font-medium text-gray-700">{user.fullName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <a className="cursor-pointer">Profile</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <a className="cursor-pointer">Settings</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <a className="text-primary-600 hover:text-primary-700 font-medium">Login</a>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
