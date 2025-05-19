import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Job } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MapSectionProps {
  jobs: Job[];
  selectedJob?: Job;
  onSelectJob?: (job: Job) => void;
  searchCoordinates?: { latitude: number; longitude: number };
}

// A simplified version of MapSection for React Native
const MapSection: React.FC<MapSectionProps> = ({ 
  jobs, 
  selectedJob, 
  onSelectJob 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Handle job selection
  const handleSelectJob = (job: Job) => {
    if (onSelectJob) {
      onSelectJob(job);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Available Jobs</Text>
      
      {jobs.length > 0 ? (
        <View style={styles.jobList}>
          {jobs.map(job => (
            <View key={job.id} style={[
              styles.jobCard,
              selectedJob?.id === job.id ? styles.selectedJob : null
            ]}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobDetail}>${job.paymentAmount} • {job.category}</Text>
              <Text style={styles.jobLocation}>{job.location || 'Remote'}</Text>
              
              <View style={styles.buttonContainer}>
                <Text style={styles.buttonText} onPress={() => handleSelectJob(job)}>
                  View Details
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No jobs available in this area</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9'
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  jobList: {
    gap: 12
  },
  jobCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    gap: 8
  },
  selectedJob: {
    borderColor: '#0284c7',
    borderWidth: 2
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  jobDetail: {
    fontSize: 14,
    color: '#666'
  },
  jobLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  buttonContainer: {
    backgroundColor: '#68D391',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#666'
  }
});

export default MapSection;