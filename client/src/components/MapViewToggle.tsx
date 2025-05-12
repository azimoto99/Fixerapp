import React, { memo } from 'react';
import { Map, Activity } from 'lucide-react';
import { 
  ToggleGroup,
  ToggleGroupItem 
} from "@/components/ui/toggle-group";

interface MapViewToggleProps {
  view: 'standard' | 'heatmap';
  onChange: (view: 'standard' | 'heatmap') => void;
  className?: string;
  totalOpenJobs?: number;
}

// Memoized toggle component to switch between standard map view and heat map view
const MapViewToggle = memo(({ view, onChange, className, totalOpenJobs = 0 }: MapViewToggleProps) => {
  return (
    <div className={`bg-background/90 border border-border/30 rounded-full shadow-md p-2 ${className || ''}`}>
      <ToggleGroup type="single" value={view} onValueChange={(value) => {
        if (value) onChange(value as 'standard' | 'heatmap');
      }}>
        <ToggleGroupItem 
          value="standard" 
          aria-label="Standard map view"
          className="rounded-full px-3 py-1 hover:bg-primary/10 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:font-medium"
        >
          <Map className="h-4 w-4" />
          <span className="text-xs ml-1.5">Map</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="heatmap" 
          aria-label="Heat map view"
          className="rounded-full px-3 py-1 hover:bg-primary/10 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:font-medium"
        >
          <Activity className="h-4 w-4" />
          <span className="text-xs ml-1.5">Heat</span>
          {view === 'heatmap' && totalOpenJobs > 0 && (
            <span className="ml-1 bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-medium">
              {totalOpenJobs}
            </span>
          )}
        </ToggleGroupItem>
      </ToggleGroup>
      {view === 'heatmap' && (
        <div className="text-xs text-center mt-1 text-muted-foreground">
          {totalOpenJobs === 0 ? 'No open jobs' : `${totalOpenJobs} open job${totalOpenJobs !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
});

export default MapViewToggle;