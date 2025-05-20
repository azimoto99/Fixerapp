// This component wraps JobDetailsCard to ensure proper z-index and visibility
import React, { useState, useEffect } from 'react';
import JobDetailsCard from './JobDetailsCard';
import { createPortal } from 'react-dom';

const JobCardFix = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [jobId, setJobId] = useState<number>(0);
  
  useEffect(() => {
    // Listen for custom event to open job details
    const handleOpenJobDetails = (e: CustomEvent<{ jobId: number }>) => {
      if (e.detail && e.detail.jobId) {
        setJobId(e.detail.jobId);
        setIsOpen(true);
        console.log('Opening job details for job ID:', e.detail.jobId);
      }
    };
    
    // Listen for setting job ID
    const handleSetJobId = (e: CustomEvent<{ jobId: number }>) => {
      if (e.detail && e.detail.jobId) {
        setJobId(e.detail.jobId);
        setIsOpen(true);
        console.log('Set job ID:', e.detail.jobId);
      }
    };
    
    // Also listen for the 'view-job-card' event that is used in existing components
    const handleViewJobCard = (e: CustomEvent<{ jobId: number }>) => {
      if (e.detail && e.detail.jobId) {
        setJobId(e.detail.jobId);
        setIsOpen(true);
        console.log('View job card for job ID:', e.detail.jobId);
      }
    };
    
    window.addEventListener('open-job-details', handleOpenJobDetails as EventListener);
    window.addEventListener('set-job-id', handleSetJobId as EventListener);
    window.addEventListener('view-job-card', handleViewJobCard as EventListener);
    
    return () => {
      window.removeEventListener('open-job-details', handleOpenJobDetails as EventListener);
      window.removeEventListener('set-job-id', handleSetJobId as EventListener);
      window.removeEventListener('view-job-card', handleViewJobCard as EventListener);
    };
  }, []);
  
  // Create a portal to the body to ensure the JobDetailsCard is rendered at the highest level
  return createPortal(
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      pointerEvents: isOpen ? 'auto' : 'none',
      visibility: isOpen ? 'visible' : 'hidden'
    }}>
      <JobDetailsCard 
        jobId={jobId} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </div>,
    document.body
  );
};

export default JobCardFix;