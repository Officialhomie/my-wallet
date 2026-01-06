import type { TransactionPhase, TransactionLifecycle } from '@/types/transaction';

/**
 * Get appropriate icon for each transaction phase
 */
export function getPhaseIcon(phase: TransactionPhase): string {
  const icons: Record<TransactionPhase, string> = {
    'preparing': '⚙️',
    'validating': '🔍',
    'estimating-gas': '💰',
    'signing': '✍️',
    'broadcasting': '📡',
    'pending': '⏳',
    'confirming': '⏳',
    'confirmed': '✅',
    'failed': '❌',
  };
  return icons[phase];
}

/**
 * Get appropriate color class for each transaction phase
 */
export function getPhaseColor(phase: TransactionPhase): string {
  const colors: Record<TransactionPhase, string> = {
    'preparing': 'blue',
    'validating': 'blue',
    'estimating-gas': 'blue',
    'signing': 'blue',
    'broadcasting': 'yellow',
    'pending': 'yellow',
    'confirming': 'yellow',
    'confirmed': 'green',
    'failed': 'red',
  };
  return colors[phase];
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generate detailed error messages with recovery suggestions
 */
export function generateErrorDetails(
  error: TransactionLifecycle['error'],
  transaction: TransactionLifecycle
): { message: string; action: string; technical: string } {
  if (!error) {
    return { message: 'Unknown error', action: 'Contact support', technical: '' };
  }

  const { reason } = error;
  const { walletAddress, gasLimit, attempt, maxAttempts } = transaction;

  switch (reason) {
    case 'insufficient-gas':
      return {
        message: `Gas limit too low (${gasLimit})`,
        action: 'Increase gas limit or disable gas constraints',
        technical: `Gas limit ${gasLimit} below required amount`,
      };

    case 'insufficient-balance':
      return {
        message: `Wallet ${walletAddress.slice(0, 10)}... has insufficient balance`,
        action: 'Fund the wallet with more ETH to cover gas costs',
        technical: `Wallet balance below transaction cost`,
      };

    case 'nonce-reused':
      return {
        message: 'Transaction nonce was already used',
        action: `Wait a moment and retry (${attempt}/${maxAttempts})`,
        technical: 'Nonce collision detected',
      };

    case 'tx-reverted':
      return {
        message: 'Transaction was reverted by the smart contract',
        action: 'Check contract requirements and parameters',
        technical: 'EVM execution reverted',
      };

    case 'network-error':
      return {
        message: 'Network connection issue',
        action: 'Check internet connection and RPC endpoint',
        technical: 'Network request failed',
      };

    case 'timeout':
      return {
        message: 'Transaction confirmation timeout',
        action: 'Increase timeout or use faster network',
        technical: 'Confirmation not received within timeout period',
      };

    default:
      return {
        message: 'Transaction failed',
        action: 'Review transaction details and try again',
        technical: error.technicalDetails || 'Unknown failure reason',
      };
  }
}

/**
 * Get human-readable message for transaction phase
 */
export function getPhaseMessage(transaction: TransactionLifecycle): string {
  const { phase, intent, walletIndex, walletAddress } = transaction;

  switch (phase) {
    case 'preparing':
      return `Preparing transaction for wallet ${walletIndex}...`;
    case 'validating':
      return `Validating wallet ${walletAddress.slice(0, 6)}... balance and nonce...`;
    case 'estimating-gas':
      return `Estimating gas costs for ${intent.method}...`;
    case 'signing':
      return `Signing transaction ${transaction.attempt}/${transaction.maxAttempts} (wallet ${walletIndex})...`;
    case 'broadcasting':
      return `Broadcasting transaction to network...`;
    case 'pending':
      return `Transaction in mempool, waiting for confirmation...`;
    case 'confirming':
      return `Confirming transaction on-chain...`;
    case 'confirmed':
      return `✅ Confirmed in block ${transaction.blockNumber || 'unknown'}`;
    case 'failed':
      return `❌ Transaction failed`;
    default:
      return `Transaction ${phase}...`;
  }
}

/**
 * Estimate ETA for pending transactions
 */
export function estimateEta(transaction: TransactionLifecycle): number {
  // Simple estimation based on network conditions
  // In real implementation, this would use more sophisticated logic
  const baseTime = 12; // seconds
  const attemptMultiplier = Math.pow(1.5, transaction.attempt - 1);
  return Math.round(baseTime * attemptMultiplier);
}
