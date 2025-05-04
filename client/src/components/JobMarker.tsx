import { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Popup } from 'react-leaflet';
import { divIcon, LatLngExpression, Icon } from 'leaflet';
import { Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface JobMarkerProps {
  job: Job;
  position: LatLngExpression;
  isSelected: boolean;
  onClick: (job: Job) => void;
}

export function JobMarker({ job, position, isSelected, onClick }: JobMarkerProps) {
  // Create a custom DoorDash-style marker with price
  const getJobIcon = () => {
    // Get color based on category
    const color = getColorForCategory(job.category);
    
    // Create HTML content for the marker
    const html = renderToStaticMarkup(
      <div 
        className={`flex items-center justify-center rounded-full shadow-lg border-2 border-white
                    ${isSelected ? 'w-14 h-14 font-bold' : 'w-12 h-12'}`}
        style={{ 
          backgroundColor: color,
          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.2s ease',
          zIndex: isSelected ? 1000 : 1
        }}
      >
        <span className="text-white text-sm">
          ${job.paymentAmount}
        </span>
      </div>
    );

    // Create the icon
    return divIcon({
      html,
      className: 'custom-job-marker',
      iconSize: [isSelected ? 56 : 48, isSelected ? 56 : 48],
      iconAnchor: [isSelected ? 28 : 24, isSelected ? 28 : 24]
    });
  };

  return (
    <Marker
      position={position}
      icon={getJobIcon()}
      eventHandlers={{
        click: () => onClick(job)
      }}
    >
      <Popup>
        <div className="font-semibold">{job.title}</div>
        <div className="text-sm">{formatCurrency(job.paymentAmount)}</div>
        <div className="text-xs text-gray-500">{job.category}</div>
      </Popup>
    </Marker>
  );
}

// Helper function to get color based on job category
function getColorForCategory(category: string): string {
  switch(category) {
    case 'Home Maintenance':
      return '#3b82f6'; // blue-500
    case 'Cleaning':
      return '#06b6d4'; // cyan-500
    case 'Delivery':
      return '#f97316'; // orange-500
    case 'Event Help':
      return '#8b5cf6'; // purple-500
    case 'Moving':
      return '#6366f1'; // indigo-500
    case 'Tech Support':
      return '#f59e0b'; // amber-500
    case 'Shopping':
      return '#f43f5e'; // rose-500
    case 'Pet Care':
      return '#10b981'; // emerald-500
    case 'Tutoring':
      return '#3b82f6'; // blue-500
    default:
      return '#6b7280'; // gray-500
  }
}