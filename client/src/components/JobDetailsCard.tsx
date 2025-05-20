import React from 'react';
import JobDetailsCard from './jobs/JobDetailsCard';

// This is a wrapper component that simply forwards props to the new implementation
interface JobDetailsCardProps {
  jobId: number;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailsCardWrapper: React.FC<JobDetailsCardProps> = ({ jobId, isOpen, onClose }) => {
  return <JobDetailsCard jobId={jobId} isOpen={isOpen} onClose={onClose} />;
};

export default JobDetailsCardWrapper;