// Validation Utilities

export function validateEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateABI(abi: string): boolean {
  try {
    const parsed = JSON.parse(abi);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function validateNumber(value: string | number, min?: number, max?: number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}
