import { Link, useLocation } from 'wouter';

const MinimalMobileNav: React.FC = () => {
  const [location] = useLocation();

  return (
    <nav className="md:hidden bg-background border-t border-border fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-center">
          <Link href="/post-job">
            <div className={`group flex flex-col items-center py-3 px-2 cursor-pointer ${location === '/post-job' ? 'text-emerald-600 border-t-2 border-emerald-600' : 'text-foreground'}`}>
              <i className="ri-add-circle-line text-xl"></i>
              <span className={`text-xs mt-1 ${location === '/post-job' ? 'font-medium' : ''}`}>Post Job</span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MinimalMobileNav;