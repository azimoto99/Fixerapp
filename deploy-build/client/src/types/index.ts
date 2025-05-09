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
