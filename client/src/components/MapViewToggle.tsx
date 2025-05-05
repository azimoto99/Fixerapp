import React, { memo } from 'react';
import { Map, Activity } from 'lucide-react';
import { 
  ToggleGroup,
  ToggleGroupItem 
} from "@/components/ui/toggle-group";

interface MapViewToggleProps {
  view: 'standard' | 'heatmap';
  onChange: (view: 'standard' | 'heatmap') => void;
}

// Memoized toggle component to switch between standard map view and heat map view
const MapViewToggle = memo(({ view, onChange }: MapViewToggleProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-full shadow-md p-2">
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
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
});

export default MapViewToggle;