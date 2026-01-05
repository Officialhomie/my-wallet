// Domain 4: Live System Status Store Slice

import { LiveSystemStatusState, SystemHealthStatus } from '@/types/domain-4';

export interface LiveSystemStatusSlice {
  liveSystemStatus: LiveSystemStatusState;

  // Actions
  updateSystemHealth: (health: SystemHealthStatus, responseTime: number, errorRate: number) => void;
  updateThroughput: (metrics: Partial<LiveSystemStatusState['throughput']>) => void;
  updateRateLimiter: (status: Partial<LiveSystemStatusState['rateLimiter']>) => void;
  updateCircuitBreaker: (status: Partial<LiveSystemStatusState['circuitBreaker']>) => void;
  setConnectionStatus: (connected: boolean) => void;
  simulateSystemUpdates: () => void;
}

const initialState: LiveSystemStatusState = {
  systemHealth: {
    status: 'healthy',
    responseTime: 45,
    errorRate: 0.1,
    lastChecked: Date.now(),
  },
  throughput: {
    transactionsPerSecond: 0,
    gasUsedPerSecond: '0',
    networkRequestsPerSecond: 0,
    blockNumber: 0,
    timestamp: Date.now(),
  },
  rateLimiter: {
    requestsPerSecond: 10,
    limit: 100,
    remaining: 90,
    resetTime: Date.now() + 60000,
  },
  circuitBreaker: {
    state: 'closed',
    failureCount: 0,
    successCount: 100,
    lastFailureTime: undefined,
    nextRetryTime: undefined,
  },
  isConnected: true,
  lastUpdate: Date.now(),
};

export const liveSystemStatusSlice = (set: (partial: any) => void, get: () => LiveSystemStatusSlice): LiveSystemStatusSlice => ({
  liveSystemStatus: initialState,

  updateSystemHealth: (status, responseTime, errorRate) => {
    set((state: LiveSystemStatusSlice) => ({
      liveSystemStatus: {
        ...state.liveSystemStatus,
        systemHealth: {
          status,
          responseTime,
          errorRate,
          lastChecked: Date.now(),
        },
        lastUpdate: Date.now(),
      }
    }));
  },

  updateThroughput: (metrics) => {
    set((state: LiveSystemStatusSlice) => ({
      liveSystemStatus: {
        ...state.liveSystemStatus,
        throughput: {
          ...state.liveSystemStatus.throughput,
          ...metrics,
          timestamp: Date.now(),
        },
        lastUpdate: Date.now(),
      }
    }));
  },

  updateRateLimiter: (status) => {
    set((state: LiveSystemStatusSlice) => ({
      liveSystemStatus: {
        ...state.liveSystemStatus,
        rateLimiter: {
          ...state.liveSystemStatus.rateLimiter,
          ...status,
        },
        lastUpdate: Date.now(),
      }
    }));
  },

  updateCircuitBreaker: (status) => {
    set((state: LiveSystemStatusSlice) => ({
      liveSystemStatus: {
        ...state.liveSystemStatus,
        circuitBreaker: {
          ...state.liveSystemStatus.circuitBreaker,
          ...status,
        },
        lastUpdate: Date.now(),
      }
    }));
  },

  setConnectionStatus: (connected) => {
    set((state: LiveSystemStatusSlice) => ({
      liveSystemStatus: {
        ...state.liveSystemStatus,
        isConnected: connected,
        lastUpdate: Date.now(),
      }
    }));
  },

  simulateSystemUpdates: () => {
    // Simulate realistic system health updates
    const state = get();

    // Random system health changes
    const healthStatuses: SystemHealthStatus[] = ['healthy', 'degraded', 'critical'];
    const randomHealth = healthStatuses[Math.floor(Math.random() * healthStatuses.length)];

    const responseTime = 30 + Math.random() * 50; // 30-80ms
    const errorRate = Math.random() * 2; // 0-2%

    get().updateSystemHealth(randomHealth, responseTime, errorRate);

    // Update throughput metrics
    const tps = Math.floor(Math.random() * 20); // 0-20 TPS
    const gasPerSecond = (Math.random() * 0.01).toFixed(6); // Small ETH amount
    const requestsPerSecond = Math.floor(Math.random() * 50); // 0-50 RPS
    const blockNumber = state.liveSystemStatus.throughput.blockNumber + Math.floor(Math.random() * 3);

    get().updateThroughput({
      transactionsPerSecond: tps,
      gasUsedPerSecond: gasPerSecond,
      networkRequestsPerSecond: requestsPerSecond,
      blockNumber,
    });

    // Update rate limiter
    const remaining = Math.max(0, state.liveSystemStatus.rateLimiter.remaining - Math.floor(Math.random() * 5));
    get().updateRateLimiter({ remaining });

    // Occasionally trigger circuit breaker events
    if (Math.random() < 0.1) { // 10% chance
      if (state.liveSystemStatus.circuitBreaker.state === 'closed' && Math.random() < 0.3) {
        // Open circuit breaker due to failures
        get().updateCircuitBreaker({
          state: 'open',
          failureCount: state.liveSystemStatus.circuitBreaker.failureCount + 1,
          lastFailureTime: Date.now(),
          nextRetryTime: Date.now() + 30000, // 30 seconds
        });
      } else if (state.liveSystemStatus.circuitBreaker.state === 'open' && Math.random() < 0.5) {
        // Move to half-open for testing
        get().updateCircuitBreaker({
          state: 'half-open',
          successCount: 0,
        });
      } else if (state.liveSystemStatus.circuitBreaker.state === 'half-open') {
        // Close circuit breaker after successful test
        get().updateCircuitBreaker({
          state: 'closed',
          successCount: state.liveSystemStatus.circuitBreaker.successCount + 1,
        });
      }
    }
  },
});