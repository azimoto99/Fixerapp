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
    <div className="px-4 sm:px-0 mb-4">
      <form className="bg-white shadow rounded-lg" onSubmit={handleSubmit}>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative flex items-center">
                <i className="ri-search-line text-gray-400 absolute left-3"></i>
                <Input
                  type="text"
                  placeholder="Search for jobs"
                  className="pl-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {JOB_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="text-gray-700"
              >
                <i className="ri-filter-3-line mr-2"></i>
                Filters
              </Button>
              <Button type="submit" className="ml-3">
                Search
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobSearch;
