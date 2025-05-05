import React, { memo } from 'react';

interface HeatmapLegendProps {
  visible: boolean;
}

// A legend component that displays a gradient with explanatory text
const HeatmapLegend = memo(({ visible }: HeatmapLegendProps) => {
  if (!visible) return null;

  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm">
      <h4 className="font-medium text-xs uppercase tracking-wider mb-1 text-gray-500">Job Density</h4>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center">
          <div className="w-12 h-3 rounded-full mr-2" style={{ 
            background: 'linear-gradient(to right, hsl(220, 80%, 70%), hsl(180, 80%, 60%), hsl(160, 80%, 55%), hsl(140, 80%, 55%), hsl(120, 80%, 60%))' 
          }}></div>
          <span className="text-xs text-gray-700">Low to High</span>
        </div>
        <div className="text-xs text-gray-500 leading-tight">
          Areas with higher job concentrations appear brighter on the heat map.
        </div>
      </div>
    </div>
  );
});

export default HeatmapLegend;