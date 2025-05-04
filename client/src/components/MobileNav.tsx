import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

const MobileNav: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const accountType = user?.accountType || 'worker';

  return (
    <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-between">
          <Link href="/">
            <div className={`group flex flex-col items-center py-3 px-2 cursor-pointer ${location === '/' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <i className="ri-compass-line text-xl"></i>
              <span className={`text-xs mt-1 ${location === '/' ? 'font-medium' : ''}`}>
                {accountType === 'worker' ? 'Find Jobs' : 'Browse'}
              </span>
            </div>
          </Link>
          
          {accountType === 'worker' ? (
            <Link href="/earnings">
              <div className={`group flex flex-col items-center py-3 px-2 cursor-pointer ${location === '/earnings' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
                <i className="ri-money-dollar-circle-line text-xl"></i>
                <span className={`text-xs mt-1 ${location === '/earnings' ? 'font-medium' : ''}`}>Earnings</span>
              </div>
            </Link>
          ) : (
            <Link href="/post-job">
              <div className={`group flex flex-col items-center py-3 px-2 cursor-pointer ${location === '/post-job' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
                <i className="ri-add-circle-line text-xl"></i>
                <span className={`text-xs mt-1 ${location === '/post-job' ? 'font-medium' : ''}`}>Post Job</span>
              </div>
            </Link>
          )}
          
          <Link href={accountType === 'worker' ? '/saved-jobs' : '/my-jobs'}>
            <div className={`group flex flex-col items-center py-3 px-2 cursor-pointer ${location === (accountType === 'worker' ? '/saved-jobs' : '/my-jobs') ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <i className={accountType === 'worker' ? "ri-bookmark-line text-xl" : "ri-briefcase-line text-xl"}></i>
              <span className={`text-xs mt-1 ${location === (accountType === 'worker' ? '/saved-jobs' : '/my-jobs') ? 'font-medium' : ''}`}>
                {accountType === 'worker' ? 'Saved' : 'My Jobs'}
              </span>
            </div>
          </Link>
          
          <Link href="/profile">
            <div className={`group flex flex-col items-center py-3 px-2 cursor-pointer ${location === '/profile' ? 'text-primary-600 border-t-2 border-primary-600' : 'text-gray-500'}`}>
              <i className="ri-user-line text-xl"></i>
              <span className={`text-xs mt-1 ${location === '/profile' ? 'font-medium' : ''}`}>Profile</span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;
