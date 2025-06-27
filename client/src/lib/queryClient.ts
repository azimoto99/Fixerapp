import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = res.statusText;
    try {
      // Try to get detailed error message if available
      const text = await res.text();
      if (text) errorText = text;
    } catch (e) {
      console.error("Failed to parse error response:", e);
    }
    
    // Handle common status codes with friendly messages
    switch (res.status) {
      case 401:
        try {
          // For login errors, provide the actual error message from the server
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || "Authentication failed");
        } catch {
          // If parsing fails, use a generic message
          throw new Error("Authentication failed. Please check your credentials.");
        }
      case 403:
        throw new Error("You don't have permission to perform this action");
      case 404:
        throw new Error("The requested resource was not found");
      case 429:
        throw new Error("Too many requests. Please try again later");
      case 500:
      case 502:
      case 503:
      case 504:
        throw new Error("Server error. Please try again later");
      default:
        throw new Error(`${res.status}: ${errorText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { signal?: AbortSignal, timeout?: number }
): Promise<Response> {
  try {
    // Setup request timeout - increased for business registration
    const timeout = options?.timeout || 30000; // 30 seconds default timeout (increased from 15)
    const controller = new AbortController();
    const signal = options?.signal || controller.signal;
    
    // Create timeout that aborts the request
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Determine headers and body based on data type
    let headers: Record<string, string> = {};
    let body: string | FormData | undefined;
    
    if (data) {
      if (data instanceof FormData) {
        // For FormData, don't set Content-Type - let browser set it with boundary
        body = data;
      } else {
        // For JSON data, set Content-Type and stringify
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include",
      signal,
    });
    
    clearTimeout(timeoutId);
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Improve error handling for network issues
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        throw new Error('Network connection issue. Please check your internet connection.');
      }
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw" | "returnEmptyArray";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  retry?: boolean;
  timeout?: number;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, timeout = 15000 }) =>
  async ({ queryKey }) => {
    try {
      // Use the improved apiRequest function instead of fetch
      const res = await apiRequest("GET", queryKey[0] as string, undefined, { timeout });
      
      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        } else if (unauthorizedBehavior === "returnEmptyArray") {
          return [] as unknown as T;
        }
      }
      
      try {
        return await res.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        throw new Error("Failed to parse server response. Please try again.");
      }
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      
      // Return empty array for unauthorized if that behavior is requested
      if (error instanceof Error && 
          error.message.includes('Authentication failed') && 
          unauthorizedBehavior === "returnEmptyArray") {
        return [] as unknown as T;
      }
      
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw", 
        retry: true,
        timeout: 20000 // Increase timeout for slower connections
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Only retry network-related errors, not server errors
        if (error instanceof Error && 
            (error.message.includes('timeout') || 
             error.message.includes('network') || 
             error.message.includes('connection'))) {
          return failureCount < 2; // Retry network errors up to 2 times
        }
        return false; // Don't retry other errors
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // Catch all mutation errors to prevent unhandled rejections
        console.error('Mutation error caught:', error);
      },
    },
  },
});

// Add global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection caught:', event.reason);
    // Prevent the error from appearing in console
    event.preventDefault();
  });
}
