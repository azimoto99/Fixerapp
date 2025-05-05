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
    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-md p-1">
      <ToggleGroup type="single" value={view} onValueChange={(value) => {
        if (value) onChange(value as 'standard' | 'heatmap');
      }}>
        <ToggleGroupItem 
          value="standard" 
          aria-label="Standard map view"
          className="rounded-full hover:bg-primary/10 data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
        >
          <Map className="h-5 w-5" />
          <span className="text-xs ml-1">Map</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="heatmap" 
          aria-label="Heat map view"
          className="rounded-full hover:bg-primary/10 data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
        >
          <Activity className="h-5 w-5" />
          <span className="text-xs ml-1">Heat</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
});

export default MapViewToggle;