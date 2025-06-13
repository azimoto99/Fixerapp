import React, { useState, useEffect } from 'react';
import MapboxMap from './MapboxMap';
import { Job } from '@shared/schema';
import { Card, CardContent } from "@/components/ui/card";

interface JobLocationMapProps {
  jobs?: Job[];
  center?: {
    latitude: number;
    longitude: number;
  };
  zoom?: number;
  selectedJobId?: number;
  onJobSelect?: (jobId: number) => void;
  showInfoCard?: boolean;
  height?: string;
  className?: string;
}

export default function JobLocationMap({
  jobs = [],
  center = { latitude: 40.7128, longitude: -74.0060 }, // Default to NYC
  zoom = 12,
  selectedJobId,
  onJobSelect,
  showInfoCard = true,
  height = '400px',
  className = ''
}: JobLocationMapProps) {
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    // Update map center when center prop changes
    setMapCenter(center);
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    // Update map zoom when zoom prop changes
    setMapZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    // If selectedJobId is provided, find the job and update center
    if (selectedJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === selectedJobId);
      if (job && job.latitude && job.longitude) {
        setSelectedJob(job);
        setMapCenter({ latitude: job.latitude, longitude: job.longitude });
        setMapZoom(15); // Zoom in when a job is selected
      }
    } else {
      setSelectedJob(null);
    }
  }, [selectedJobId, jobs]);

  // Create markers from jobs with contextual styling
  const markers = jobs.map(job => ({
    latitude: job.latitude || 0,
    longitude: job.longitude || 0,
    title: job.title,
    description: `$${job.paymentAmount} - ${job.paymentType}`,
    onClick: () => {
      setSelectedJob(job);
      if (onJobSelect) {
        onJobSelect(job.id);
      }
    },
    // Add contextual styling data
    category: job.category,
    paymentAmount: job.paymentAmount || 0,
    requiredSkills: job.requiredSkills || [],
    status: job.status || 'open',
    isHighlighted: selectedJob?.id === job.id
    // NO MORE STUPID RADIUS CIRCLES
  })).filter(marker => marker.latitude && marker.longitude); // Filter out jobs without coordinates

  // Handle map click to view job details
  const handleJobClick = () => {
    if (selectedJob) {
      window.location.href = `/jobs/${selectedJob.id}`;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <MapboxMap
        latitude={mapCenter.latitude}
        longitude={mapCenter.longitude}
        zoom={mapZoom}
        markers={markers}
        style={{ width: '100%', height }}
      />
      
      {showInfoCard && selectedJob && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-xs bg-white dark:bg-gray-900 shadow-lg">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold truncate">{selectedJob.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{selectedJob.location}</p>
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                ${selectedJob.paymentAmount} · {selectedJob.paymentType}
              </span>
              <button 
                onClick={handleJobClick}
                className="text-sm text-primary hover:underline"
              >
                View Details
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}