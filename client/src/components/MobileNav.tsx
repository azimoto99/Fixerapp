import { Link, useLocation } from 'wouter';

const MobileNav: React.FC = () => {
  const [location] = useLocation();

  return (
    <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-between">
          <Link href="/">
            <a className={`group flex flex-col items-center py-3 px-2 ${location === '/' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <i className="ri-compass-line text-xl"></i>
              <span className={`text-xs mt-1 ${location === '/' ? 'font-medium' : ''}`}>Explore</span>
            </a>
          </Link>
          <Link href="/saved-jobs">
            <a className={`group flex flex-col items-center py-3 px-2 ${location === '/saved-jobs' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <i className="ri-bookmark-line text-xl"></i>
              <span className={`text-xs mt-1 ${location === '/saved-jobs' ? 'font-medium' : ''}`}>Saved</span>
            </a>
          </Link>
          <Link href="/messages">
            <a className={`group flex flex-col items-center py-3 px-2 ${location === '/messages' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <div className="relative">
                <i className="ri-message-2-line text-xl"></i>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">3</span>
              </div>
              <span className={`text-xs mt-1 ${location === '/messages' ? 'font-medium' : ''}`}>Messages</span>
            </a>
          </Link>
          <Link href="/profile">
            <a className={`group flex flex-col items-center py-3 px-2 ${location === '/profile' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <i className="ri-user-line text-xl"></i>
              <span className={`text-xs mt-1 ${location === '/profile' ? 'font-medium' : ''}`}>Profile</span>
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;
