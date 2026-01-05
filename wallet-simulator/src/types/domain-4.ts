// Domain 4: Live System Status Types

export type SystemHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface SystemHealthMetrics {
  status: SystemHealthStatus;
  responseTime: number; // ms
  errorRate: number; // percentage
  lastChecked: number; // timestamp
}

export interface ThroughputMetrics {
  transactionsPerSecond: number;
  gasUsedPerSecond: string; // ETH
  networkRequestsPerSecond: number;
  blockNumber: number;
  timestamp: number;
}

export interface RateLimiterStatus {
  requestsPerSecond: number;
  limit: number;
  remaining: number;
  resetTime: number;
}

export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
}

export interface LiveSystemStatusState {
  systemHealth: SystemHealthMetrics;
  throughput: ThroughputMetrics;
  rateLimiter: RateLimiterStatus;
  circuitBreaker: CircuitBreakerStatus;
  isConnected: boolean;
  lastUpdate: number;
}