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
    <Card className={`absolute bottom-4 left-4 z-30 w-80 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            Map Pin Guide
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Job Categories */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Job Categories</h4>
            <div className="grid grid-cols-2 gap-2">
              {legendItems.map(({ category, config }) => (
                <div key={category} className="flex items-center gap-2">
                  <PinPreview config={config} size={20} />
                  <span className="text-xs truncate">{category}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Tiers */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Payment Tiers</h4>
            <div className="space-y-1">
              {paymentTiers.map(({ label, amount }) => (
                <div key={label} className="flex items-center gap-2">
                  <PinPreview 
                    config={{
                      category: 'Other',
                      paymentAmount: amount,
                      requiredSkills: [],
                      status: 'open'
                    }}
                    size={amount <= 50 ? 16 : amount <= 150 ? 20 : 24}
                  />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Indicators */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Skill Indicators</h4>
            <div className="space-y-1">
              {skillExamples.map(({ label, skills, border }) => (
                <div key={label} className="flex items-center gap-2">
                  <PinPreview 
                    config={{
                      category: 'Other',
                      paymentAmount: 75,
                      requiredSkills: skills,
                      status: 'open'
                    }}
                    size={20}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs">{label}</span>
                    <span className="text-xs text-muted-foreground">{border}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Indicators */}
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Job Status</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Open
              </Badge>
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                Assigned
              </Badge>
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                In Progress
              </Badge>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Larger pins = higher pay</p>
              <p>• Hover pins for details</p>
              <p>• Gold border = premium skills</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
