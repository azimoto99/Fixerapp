import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  jobCount: number;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange, jobCount }) => {
  return (
    <div className="px-4 sm:px-0 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Available Jobs</h2>
          <p className="text-sm text-gray-500">{jobCount} jobs near you</p>
        </div>
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            type="button"
            variant="tab"
            className={`rounded-l-md ${
              view === 'list'
                ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => onViewChange('list')}
          >
            <i className="ri-list-check text-gray-500 mr-2"></i>
            List
          </Button>
          <Button
            type="button"
            variant="tab"
            className={`rounded-r-md ${
              view === 'map'
                ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => onViewChange('map')}
          >
            <i className="ri-map-pin-line mr-2"></i>
            Map
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewToggle;
