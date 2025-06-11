import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { generatePinStyle, generatePinCSS } from '@/lib/mapPinStyles';
import { JOB_CATEGORIES } from '@shared/schema';

interface MapPinLegendProps {
  className?: string;
}

export function MapPinLegend({ className = '' }: MapPinLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  // Sample configurations for legend
  const legendItems = JOB_CATEGORIES.map(category => ({
    category,
    config: {
      category,
      paymentAmount: 75, // Medium payment for consistent sizing
      requiredSkills: [],
      status: 'open'
    }
  }));

  const paymentTiers = [
    { label: 'Low Pay ($1-50)', amount: 25 },
    { label: 'Medium Pay ($51-150)', amount: 100 },
    { label: 'High Pay ($151+)', amount: 200 }
  ];

  const skillExamples = [
    { label: 'Premium Skills', skills: ['Electrical'], border: 'Gold border' },
    { label: 'Physical Skills', skills: ['Heavy Lifting'], border: 'Bold border' },
    { label: 'Creative Skills', skills: ['Design'], border: 'Dashed border' }
  ];

  const PinPreview = ({ config, size = 24 }: { config: any; size?: number }) => {
    const pinStyle = generatePinStyle(config, isDark);
    const cssStyles = generatePinCSS({ ...pinStyle, size });
    
    return (
      <div
        style={cssStyles}
        className="inline-flex items-center justify-center"
      >
        {pinStyle.icon}
      </div>
    );
  };

  return (
    <Card className={`absolute top-4 left-4 z-30 w-72 bg-background/95 backdrop-blur-sm border-border/50 shadow-lg ${className}`}>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="w-3 h-3 text-primary" />
            </div>
            Pin Guide
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0 hover:bg-primary/10 rounded-full"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 px-3 pb-3 space-y-3">
          {/* Job Categories */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Categories</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {legendItems.slice(0, 8).map(({ category, config }) => (
                <div key={category} className="flex items-center gap-1.5 p-1 rounded hover:bg-muted/50 transition-colors">
                  <PinPreview config={config} size={18} />
                  <span className="text-xs truncate font-medium">{category}</span>
                </div>
              ))}
            </div>
            {legendItems.length > 8 && (
              <div className="text-xs text-muted-foreground mt-1 text-center">
                +{legendItems.length - 8} more categories
              </div>
            )}
          </div>

          {/* Payment Tiers */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Pay Levels</h4>
            <div className="flex items-center justify-between">
              {paymentTiers.map(({ label, amount }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-1 rounded hover:bg-muted/50 transition-colors">
                  <PinPreview
                    config={{
                      category: 'Other',
                      paymentAmount: amount,
                      requiredSkills: [],
                      status: 'open'
                    }}
                    size={amount <= 50 ? 14 : amount <= 150 ? 18 : 22}
                  />
                  <span className="text-xs font-medium text-center leading-tight">
                    {amount <= 50 ? 'Low' : amount <= 150 ? 'Med' : 'High'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Indicators */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Skill Types</h4>
            <div className="flex items-center justify-between">
              {skillExamples.map(({ label, skills, border }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-1 rounded hover:bg-muted/50 transition-colors">
                  <PinPreview
                    config={{
                      category: 'Other',
                      paymentAmount: 75,
                      requiredSkills: skills,
                      status: 'open'
                    }}
                    size={16}
                  />
                  <span className="text-xs font-medium text-center leading-tight">
                    {label === 'Premium Skills' ? 'Premium' : label === 'Physical Skills' ? 'Physical' : 'Creative'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                <span>Size = Pay Level</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                <span>Gold = Premium</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
