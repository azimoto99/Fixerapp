import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Job } from '@shared/schema';
import { LatLngExpression } from 'leaflet';

interface HeatmapLayerProps {
  jobs: Array<{
    job: Job;
    position: LatLngExpression;
  }>;
  intensity?: number;
  radius?: number;
  blur?: number;
  visible?: boolean;
}

// Convert job payment amount to intensity value
function getIntensity(job: Job): number {
  // Scale from 1-5 based on payment amount, with higher payments being more intense
  const min = 5; // minimum intensity
  const max = 100; // maximum intensity
  
  // Assuming payment amounts between $10 and $1000
  const normalizedValue = Math.min(Math.max((job.paymentAmount - 10) / 990, 0), 1);
  return min + normalizedValue * (max - min);
}

const HeatmapLayer = ({ 
  jobs, 
  intensity = 0.6, 
  radius = 25, 
  blur = 15,
  visible = true 
}: HeatmapLayerProps) => {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  
  useEffect(() => {
    if (!visible) {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }
    
    if (!map) return;
    
    const heatData = jobs.map(({ job, position }) => {
      // Convert position to [lat, lng, intensity]
      let lat: number, lng: number;
      
      if (Array.isArray(position)) {
        [lat, lng] = position;
      } else if ('lat' in position && 'lng' in position) {
        lat = position.lat;
        lng = position.lng;
      } else {
        // Fallback
        return null;
      }
      
      const jobIntensity = getIntensity(job) * intensity;
      return [lat, lng, jobIntensity];
    }).filter(Boolean) as [number, number, number][];
    
    // Remove existing layer if it exists
    if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
      map.removeLayer(heatLayerRef.current);
    }
    
    // Create and add the heat layer
    // @ts-ignore: For some reason TS doesn't recognize L.heatLayer even with types imported
    heatLayerRef.current = L.heatLayer(heatData, {
      radius,
      blur,
      maxZoom: 17,
      gradient: {
        0.0: 'hsl(220, 80%, 70%)', // light blue for low density
        0.3: 'hsl(180, 80%, 60%)', // teal for medium-low density
        0.5: 'hsl(160, 80%, 55%)', // turquoise for medium density
        0.7: 'hsl(140, 80%, 55%)', // green for medium-high density
        1.0: 'hsl(120, 80%, 60%)'  // yellow-green for high density
      }
    });
    
    if (visible) {
      heatLayerRef.current.addTo(map);
    }
    
    // Cleanup
    return () => {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, jobs, intensity, radius, blur, visible]);
  
  return null;
};

export default HeatmapLayer;