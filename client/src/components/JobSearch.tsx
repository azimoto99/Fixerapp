import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_CATEGORIES } from '@shared/schema';

interface JobSearchProps {
  onSearch: (params: { query: string; category: string }) => void;
}

const JobSearch: React.FC<JobSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If category is 'all', pass empty string to search all categories
    const searchCategory = category === 'all' ? '' : category;
    onSearch({ query, category: searchCategory });
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col">
          {/* Ultra-compact DoorDash-style search bar */}
          <div className="flex items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
              </div>
              <Input
                type="text"
                placeholder="Search jobs..."
                className="pl-10 pr-2 py-2 rounded-full border-gray-200 shadow-none bg-gray-100"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="ml-1 rounded-full w-8 h-8 p-0 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-1 rounded-full w-8 h-8 p-0 flex items-center justify-center"
              onClick={() => setCategory(category ? '' : 'Delivery')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </Button>
          </div>
          
          {/* Ultra-compact category horizontal pills */}
          <div className="flex items-center space-x-1 overflow-x-auto mt-1 no-scrollbar">
            <div 
              className={`px-2 py-0.5 rounded-full text-xs cursor-pointer whitespace-nowrap ${category === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setCategory('')}
            >
              All
            </div>
            {JOB_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className={`px-2 py-0.5 rounded-full text-xs cursor-pointer whitespace-nowrap ${category === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobSearch;
