import React, { memo } from 'react';

interface HeatmapLegendProps {
  visible: boolean;
}

// A legend component that displays a gradient with explanatory text
const HeatmapLegend = memo(({ visible }: HeatmapLegendProps) => {
  if (!visible) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-md p-3 text-sm">
      <h4 className="font-medium text-xs uppercase tracking-wider mb-2 text-muted-foreground">Job Density</h4>
      <div className="flex flex-col gap-2">
        <div className="flex items-center">
          <div className="w-16 h-3 rounded-full mr-2" style={{
            background: 'linear-gradient(to right, hsl(220, 80%, 70%), hsl(180, 80%, 60%), hsl(160, 80%, 55%), hsl(140, 80%, 55%), hsl(120, 80%, 60%))'
          }}></div>
          <span className="text-xs text-foreground font-medium">Low to High</span>
        </div>
        <div className="text-xs text-muted-foreground leading-tight">
          Areas with higher job concentrations appear brighter on the heat map.
        </div>
      </div>
    </div>
  );
});

export default HeatmapLegend;