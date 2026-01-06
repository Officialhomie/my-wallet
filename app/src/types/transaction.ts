/**
 * Transaction lifecycle phases in order of execution
 */
export type TransactionPhase =
  | 'preparing'
  | 'validating'
  | 'estimating-gas'
  | 'signing'
  | 'broadcasting'
  | 'pending'
  | 'confirming'
  | 'confirmed'
  | 'failed';

/**
 * Reasons why a transaction might fail
 */
export type FailureReason =
  | 'insufficient-gas'
  | 'insufficient-balance'
  | 'nonce-reused'
  | 'tx-reverted'
  | 'network-error'
  | 'timeout'
  | 'user-rejected'
  | 'unknown';

/**
 * Detailed error information for failed transactions
 */
export interface ErrorDetail {
  reason: FailureReason;
  message: string;           // Human-readable message
  technicalDetails: string;  // For debugging
  suggestedAction: string;   // What user should do
  canRetry: boolean;         // Whether retry is possible
}

/**
 * Precondition check result
 */
export interface PreconditionCheck {
  name: string;         // "Wallet Balance"
  status: 'pending' | 'pass' | 'fail';
  message: string;      // "0.0015 ETH required, 0.002 ETH available ✓"
}

/**
 * Complete transaction lifecycle state
 */
export interface TransactionLifecycle {
  // Identity
  id: string;                 // Unique transaction ID
  simulationId: string;       // Parent simulation
  walletIndex: number;        // Which wallet (0-9)
  walletAddress: string;      // 0x...

  // Lifecycle
  phase: TransactionPhase;
  startedAt: number;          // Timestamp
  completedAt?: number;       // Timestamp

  // Intent (what user wants to do)
  intent: {
    method: string;           // "transfer(address,uint256)"
    params: any[];           // [0x..., 1000000]
    value?: string;          // "0.1" ETH (for payable)
  };

  // Preconditions (what must be true)
  preconditions: PreconditionCheck[];

  // Execution details
  nonce?: number;
  gasEstimate?: string;
  gasPrice?: string;
  gasLimit?: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  actualCost?: string;        // In ETH

  // Retry logic
  attempt: number;            // Current attempt (1-indexed)
  maxAttempts: number;        // Usually 3
  retryStrategy: 'immediate' | 'exponential-backoff' | 'manual';
  nextRetryAt?: number;       // Timestamp

  // Error handling
  error?: ErrorDetail;
}

/**
 * Simulation execution state with transaction tracking
 */
export interface SimulationExecution {
  simulationId: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';

  // High-level progress
  progress: {
    phase: 'preparing' | 'executing' | 'completing';
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    percentage: number;
    eta: number; // seconds
  };

  // Transaction tracking
  transactions: TransactionLifecycle[];

  // Current activity (for real-time display)
  currentTransaction?: string; // ID of tx currently executing

  // Summary stats (for completed simulation)
  summary?: {
    duration: number;           // Total time in seconds
    successRate: number;        // 0-100
    totalGasUsed: string;       // Total ETH spent
    avgTransactionTime: number; // Avg time per tx in seconds
    failureBreakdown: Record<FailureReason, number>;
  };
}
