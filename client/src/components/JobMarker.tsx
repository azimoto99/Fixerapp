import { useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Popup } from 'react-leaflet';
import { divIcon, LatLngExpression } from 'leaflet';
import { Job } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface JobMarkerProps {
  job: Job;
  position: LatLngExpression;
  isSelected: boolean;
  onClick: (job: Job) => void;
}

// Helper function to get color based on job category using our theme colors
function getColorForCategory(category: string): string {
  // Create variations of our primary color (hsl(160, 84%, 39%))
  switch(category) {
    case 'Home Maintenance':
      return 'hsl(160, 84%, 39%)'; // primary
    case 'Cleaning':
      return 'hsl(160, 84%, 45%)'; // lighter primary
    case 'Delivery':
      return 'hsl(180, 84%, 39%)'; // blue-green variant
    case 'Event Help':
      return 'hsl(140, 84%, 39%)'; // green variant
    case 'Moving':
      return 'hsl(160, 84%, 30%)'; // darker primary
    case 'Tech Support':
      return 'hsl(170, 84%, 39%)'; // teal variant
    case 'Shopping':
      return 'hsl(150, 84%, 39%)'; // lighter green variant
    case 'Pet Care':
      return 'hsl(130, 84%, 39%)'; // green variant
    case 'Tutoring':
      return 'hsl(190, 84%, 39%)'; // blue variant
    default:
      return 'hsl(160, 30%, 39%)'; // desaturated primary
  }
}

// Function to get category-specific icon
function getIconForCategory(category: string) {
  // Using simple SVG icons for better performance
  switch(category) {
    case 'Home Maintenance':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M11 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM11 6.5v1a.75.75 0 01-1.5 0v-1h-1A.75.75 0 018.5 5h1V4a.75.75 0 011.5 0v1h1a.75.75 0 010 1.5h-1z" />
        </svg>
      );
    case 'Cleaning':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 21.75h6.75a2.25 2.25 0 002.25-2.25v-6.75h-9v9z" />
        </svg>
      );
    case 'Delivery':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
          <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
          <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>
      );
    case 'Event Help':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
        </svg>
      );
    case 'Moving':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.205c.933.085 1.857.197 2.107.202 1.482.035 2.393.907 2.393 2.234v11.559c0 1.327-.91 2.199-2.393 2.235-2.66.064-5.336.139-7.307.139-1.97 0-4.646-.075-7.307-.139-1.483-.036-2.393-.908-2.393-2.235V7.891c0-1.327.91-2.199 2.393-2.234.25-.005 1.174-.117 2.107-.202V5.25zm1.5 0v.325c1.943-.181 4.057-.181 6 0V5.25A1.5 1.5 0 0013.5 3.75h-3a1.5 1.5 0 00-1.5 1.5z" clipRule="evenodd" />
        </svg>
      );
    case 'Tech Support':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path fillRule="evenodd" d="M2.25 6a3 3 0 013-3h13.5a3 3 0 013 3v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V6zm3.97.97a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 010-1.06zm4.28 4.28a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clipRule="evenodd" />
        </svg>
      );
    case 'Shopping':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" clipRule="evenodd" />
        </svg>
      );
    case 'Pet Care':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
        </svg>
      );
    case 'Tutoring':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
          <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
          <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
        </svg>
      );
  }
}

export function JobMarker({ job, position, isSelected, onClick }: JobMarkerProps) {
  // Get color based on category
  const color = getColorForCategory(job.category);
  
  // Create a custom DoorDash-style marker with price
  const icon = useMemo(() => {
    // Create HTML content for the marker
    const html = renderToStaticMarkup(
      <div className="marker-container">
        {/* Main marker circle */}
        <div 
          className={`flex items-center justify-center rounded-full shadow-lg border-2 border-white
                    ${isSelected ? 'w-16 h-16 font-bold animate-pulse-slow' : 'w-14 h-14 animate-bounce-in'}`}
          style={{ 
            backgroundColor: color,
            zIndex: isSelected ? '1000' : '1',
            position: 'relative'
          }}
        >
          {/* Amount badge for better readability */}
          <div 
            className={`flex items-center justify-center ${isSelected ? 'text-base' : 'text-sm'}`} 
            style={{ 
              position: 'relative', 
              zIndex: 10,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}
          >
            <span className="text-white font-bold">
              ${job.paymentAmount}
            </span>
          </div>
          
          {/* Animated pulse effect when selected */}
          {isSelected && (
            <>
              <div
                className="absolute w-full h-full rounded-full animate-pulse-marker"
                style={{
                  border: `2px solid ${color}`,
                  opacity: 0.7,
                  transform: 'scale(1.2)'
                }}
              ></div>
              <div
                className="absolute w-full h-full rounded-full animate-pulse-marker"
                style={{
                  border: `2px solid ${color}`,
                  opacity: 0.5,
                  animationDelay: '0.5s',
                  transform: 'scale(1.4)'
                }}
              ></div>
            </>
          )}

          {/* Category Icon inside the marker based on job type - makes pins easier to distinguish */}
          <div 
            className="absolute inset-0 flex items-center justify-center opacity-20"
            style={{ zIndex: 5 }}
          >
            {getIconForCategory(job.category)}
          </div>
        </div>
        
        {/* Mini label below (optional) */}
        {isSelected && (
          <div 
            className="text-xs mt-2 px-3 py-1 bg-white rounded-full shadow-md text-center whitespace-nowrap animate-bounce-in font-bold"
            style={{ color: color }}
          >
            {job.category}
          </div>
        )}
      </div>
    );

    // Add animation keyframes and mobile-friendly styles
    const style = `
      @keyframes pulse {
        0% { transform: scale(1.1); opacity: 0.9; }
        70% { transform: scale(1.3); opacity: 0.3; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      
      @keyframes pulse-slow {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .marker-container {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      /* Mobile optimizations for tap targets */
      @media (max-width: 768px) {
        .marker-container > div:first-child {
          min-width: 44px;
          min-height: 44px;
        }
      }
    `;

    // Create the icon with larger touch targets for mobile
    return divIcon({
      html: `<style>${style}</style>${html}`,
      className: 'custom-job-marker',
      iconSize: [isSelected ? 100 : 60, isSelected ? 100 : 60],
      iconAnchor: [isSelected ? 50 : 30, isSelected ? 50 : 30]
    });
  }, [job.paymentAmount, job.category, color, isSelected]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick(job)
      }}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup>
        <div className="font-semibold">{job.title}</div>
        <div className="text-sm">{formatCurrency(job.paymentAmount)}</div>
        <div className="text-xs text-gray-500">{job.category}</div>
      </Popup>
    </Marker>
  );
}