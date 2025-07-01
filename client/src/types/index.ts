export interface SearchParams {
  query: string;
  category: string;
}

export interface JobFilter {
  category?: string;
  status?: string;
  posterId?: number;
  workerId?: number;
  search?: string;
}

export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  amount: number;
  category: string;
}

// Job distance information
export interface JobWithDistance {
  jobId: number;
  distance: number; // in miles
}

// Job interface matching the database schema
export interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  location: string;
  location_encrypted: string | null;
  posterId: number;
  workerId: number | null;
  paymentAmount: number;
  paymentType: string;
  serviceFee: number;
  totalAmount: number;
  datePosted: Date | null;
  dateNeeded: Date;
  requiredSkills: string[];
  equipmentProvided: boolean;
  autoAccept: boolean;
  startTime: Date | null;
  clockInTime: Date | null;
  completionTime: Date | null;
  completedAt: Date | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  workerTrackingEnabled: boolean | null;
  verifyLocationToStart: boolean | null;
  markerColor: string | null;
}
