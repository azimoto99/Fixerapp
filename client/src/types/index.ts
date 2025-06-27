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
  posterId: number;
  workerId: number | null;
  paymentAmount: number;
  paymentType: string;
  estimatedHours: number | null;
  datePosted: Date | null;
  dateNeeded: Date;
  startDate: Date | null;
  completedAt: Date | null;
  startedAt: Date | null;
  equipmentProvided: boolean;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  duration: string | null;
  totalAmount: number;
  serviceFee: number;
  autoAccept: boolean;
  startTime: Date | null;
  markerColor: string | null;
}
