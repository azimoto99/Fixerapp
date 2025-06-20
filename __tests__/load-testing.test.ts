import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';

// Load testing configuration
const LOAD_TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  concurrentUsers: 50,
  testDuration: 30000, // 30 seconds
  requestDelay: 100, // 100ms between requests
  timeoutMs: 10000, // 10 second timeout per request
};

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: { [key: string]: number };
}

interface TestEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

class LoadTester {
  private results: LoadTestResult[] = [];
  private activeRequests: number = 0;
  private maxConcurrentRequests: number = 0;

  async runLoadTest(endpoint: TestEndpoint, config = LOAD_TEST_CONFIG): Promise<LoadTestResult> {
    console.log(`\n🚀 Starting load test for ${endpoint.name}`);
    console.log(`📊 Config: ${config.concurrentUsers} users, ${config.testDuration}ms duration`);

    const startTime = performance.now();
    const endTime = startTime + config.testDuration;
    const responseTimes: number[] = [];
    const errors: { [key: string]: number } = {};
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    // Create promise pool for concurrent requests
    const requestPromises: Promise<void>[] = [];

    // Simulate concurrent users
    for (let user = 0; user < config.concurrentUsers; user++) {
      const userPromise = this.simulateUser(
        endpoint,
        endTime,
        config.requestDelay,
        config.timeoutMs,
        (responseTime, success, error) => {
          totalRequests++;
          if (success) {
            successfulRequests++;
            responseTimes.push(responseTime);
          } else {
            failedRequests++;
            const errorKey = error?.message || 'Unknown error';
            errors[errorKey] = (errors[errorKey] || 0) + 1;
          }
        }
      );
      requestPromises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(requestPromises);

    const totalDuration = performance.now() - startTime;
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    const result: LoadTestResult = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: totalRequests / (totalDuration / 1000),
      errorRate: (failedRequests / totalRequests) * 100,
      errors
    };

    this.results.push(result);
    this.logResults(endpoint.name, result);
    return result;
  }

  private async simulateUser(
    endpoint: TestEndpoint,
    endTime: number,
    requestDelay: number,
    timeoutMs: number,
    onResult: (responseTime: number, success: boolean, error?: Error) => void
  ): Promise<void> {
    while (performance.now() < endTime) {
      this.activeRequests++;
      this.maxConcurrentRequests = Math.max(this.maxConcurrentRequests, this.activeRequests);

      const requestStart = performance.now();
      try {
        await this.makeRequest(endpoint, timeoutMs);
        const responseTime = performance.now() - requestStart;
        onResult(responseTime, true);
      } catch (error) {
        const responseTime = performance.now() - requestStart;
        onResult(responseTime, false, error as Error);
      } finally {
        this.activeRequests--;
      }

      // Wait before next request
      if (performance.now() < endTime) {
        await new Promise(resolve => setTimeout(resolve, requestDelay));
      }
    }
  }

  private async makeRequest(endpoint: TestEndpoint, timeoutMs: number): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${LOAD_TEST_CONFIG.baseUrl}${endpoint.path}`;
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...endpoint.headers
        },
        signal: controller.signal
      };

      if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Consume response to simulate real usage
      await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private logResults(endpointName: string, result: LoadTestResult): void {
    console.log(`\n📈 Load Test Results for ${endpointName}:`);
    console.log(`   Total Requests: ${result.totalRequests}`);
    console.log(`   Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${result.failedRequests} (${result.errorRate.toFixed(1)}%)`);
    console.log(`   Requests/sec: ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`   Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${result.minResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${result.maxResponseTime.toFixed(2)}ms`);
    console.log(`   Max Concurrent: ${this.maxConcurrentRequests}`);
    
    if (Object.keys(result.errors).length > 0) {
      console.log(`   Errors:`);
      Object.entries(result.errors).forEach(([error, count]) => {
        console.log(`     ${error}: ${count}`);
      });
    }
  }

  getOverallStats(): any {
    if (this.results.length === 0) return null;

    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedRequests, 0);
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.averageResponseTime, 0) / this.results.length;
    const avgRequestsPerSec = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;

    return {
      totalRequests,
      totalSuccessful,
      totalFailed,
      overallSuccessRate: (totalSuccessful / totalRequests) * 100,
      averageResponseTime: avgResponseTime,
      averageRequestsPerSecond: avgRequestsPerSec,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }
}

describe('Load Testing Suite', () => {
  let loadTester: LoadTester;

  beforeAll(() => {
    loadTester = new LoadTester();
    console.log(`\n🎯 Starting Load Testing Suite`);
    console.log(`📍 Target: ${LOAD_TEST_CONFIG.baseUrl}`);
    console.log(`👥 Concurrent Users: ${LOAD_TEST_CONFIG.concurrentUsers}`);
    console.log(`⏱️  Test Duration: ${LOAD_TEST_CONFIG.testDuration}ms`);
  });

  afterAll(() => {
    const stats = loadTester.getOverallStats();
    if (stats) {
      console.log(`\n🏁 Overall Load Test Results:`);
      console.log(`   Total Requests: ${stats.totalRequests}`);
      console.log(`   Success Rate: ${stats.overallSuccessRate.toFixed(1)}%`);
      console.log(`   Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
      console.log(`   Avg Requests/sec: ${stats.averageRequestsPerSecond.toFixed(2)}`);
      console.log(`   Max Concurrent: ${stats.maxConcurrentRequests}`);
    }
  });

  describe('API Endpoint Load Tests', () => {
    it('should handle concurrent requests to health check endpoint', async () => {
      const endpoint: TestEndpoint = {
        name: 'Health Check',
        method: 'GET',
        path: '/api/health'
      };

      const result = await loadTester.runLoadTest(endpoint, {
        ...LOAD_TEST_CONFIG,
        concurrentUsers: 100, // Higher load for health check
        testDuration: 15000 // Shorter duration
      });

      // Health check should have very high success rate
      expect(result.errorRate).toBeLessThan(5);
      expect(result.averageResponseTime).toBeLessThan(500);
      expect(result.requestsPerSecond).toBeGreaterThan(10);
    }, 30000);

    it('should handle concurrent job listing requests', async () => {
      const endpoint: TestEndpoint = {
        name: 'Job Listings',
        method: 'GET',
        path: '/api/jobs?limit=20'
      };

      const result = await loadTester.runLoadTest(endpoint);

      // Job listings should handle moderate load
      expect(result.errorRate).toBeLessThan(10);
      expect(result.averageResponseTime).toBeLessThan(2000);
      expect(result.requestsPerSecond).toBeGreaterThan(5);
    }, 45000);

    it('should handle concurrent job search requests', async () => {
      const endpoint: TestEndpoint = {
        name: 'Job Search',
        method: 'GET',
        path: '/api/jobs?search=cleaning&location=San Francisco'
      };

      const result = await loadTester.runLoadTest(endpoint);

      // Search should be responsive under load
      expect(result.errorRate).toBeLessThan(15);
      expect(result.averageResponseTime).toBeLessThan(3000);
      expect(result.requestsPerSecond).toBeGreaterThan(3);
    }, 45000);
  });

  describe('Database Load Tests', () => {
    it('should handle concurrent database read operations', async () => {
      const endpoint: TestEndpoint = {
        name: 'Database Read Heavy',
        method: 'GET',
        path: '/api/jobs?hasCoordinates=true&limit=50'
      };

      const result = await loadTester.runLoadTest(endpoint, {
        ...LOAD_TEST_CONFIG,
        concurrentUsers: 30,
        testDuration: 25000
      });

      // Database reads should be relatively stable
      expect(result.errorRate).toBeLessThan(20);
      expect(result.averageResponseTime).toBeLessThan(4000);
    }, 40000);
  });

  describe('Memory and Resource Tests', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      const endpoint: TestEndpoint = {
        name: 'Memory Stress Test',
        method: 'GET',
        path: '/api/jobs?limit=100'
      };

      await loadTester.runLoadTest(endpoint, {
        ...LOAD_TEST_CONFIG,
        concurrentUsers: 40,
        testDuration: 20000
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`\n💾 Memory Usage:`);
      console.log(`   Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(1)}%)`);

      // Memory increase should be reasonable (less than 100% increase)
      expect(memoryIncreasePercent).toBeLessThan(100);
    }, 35000);
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle invalid requests under load', async () => {
      const endpoint: TestEndpoint = {
        name: 'Invalid Requests',
        method: 'GET',
        path: '/api/nonexistent-endpoint'
      };

      const result = await loadTester.runLoadTest(endpoint, {
        ...LOAD_TEST_CONFIG,
        concurrentUsers: 30,
        testDuration: 15000
      });

      // Should handle errors gracefully without crashing
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(2000); // Quick 404 responses
    }, 25000);
  });
}); 