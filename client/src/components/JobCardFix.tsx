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
      }
    };
    
    // Listen for setting job ID
    const handleSetJobId = (e: CustomEvent<{ jobId: number }>) => {
      if (e.detail && e.detail.jobId) {
        setJobId(e.detail.jobId);
        setIsOpen(true);
      }
    };
    
    window.addEventListener('open-job-details', handleOpenJobDetails as EventListener);
    window.addEventListener('set-job-id', handleSetJobId as EventListener);
    
    return () => {
      window.removeEventListener('open-job-details', handleOpenJobDetails as EventListener);
      window.removeEventListener('set-job-id', handleSetJobId as EventListener);
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