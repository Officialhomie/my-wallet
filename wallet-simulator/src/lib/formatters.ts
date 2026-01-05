// Data Formatters

export function formatAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatGas(gas: string | number): string {
  const num = typeof gas === 'string' ? parseFloat(gas) : gas;
  if (num >= 1e18) {
    return `${(num / 1e18).toFixed(4)} ETH`;
  }
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)} Gwei`;
  }
  return `${num} Wei`;
}
