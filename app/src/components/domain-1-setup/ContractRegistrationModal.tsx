'use client';

import { useStore } from '@/store';
import { useState } from 'react';

interface ContractRegistrationModalProps {
  onClose: () => void;
}

export function ContractRegistrationModal({ onClose }: ContractRegistrationModalProps) {
  const { availableNetworks, isLoading, error } = useStore((state) => state.systemSetup);
  const registerContract = useStore((state) => state.registerContract);

  const [formData, setFormData] = useState({
    name: '',
    network: '',
    address: '',
    abi: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Contract name is required';
    }

    if (!formData.network) {
      errors.network = 'Network is required';
    }

    if (!formData.address.trim()) {
      errors.address = 'Contract address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.address)) {
      errors.address = 'Invalid Ethereum address format';
    }

    if (!formData.abi.trim()) {
      errors.abi = 'ABI is required';
    } else {
      try {
        JSON.parse(formData.abi);
      } catch {
        errors.abi = 'Invalid JSON format';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await registerContract({
        name: formData.name,
        network: formData.network,
        address: formData.address,
        abi: JSON.parse(formData.abi),
      });

      onClose();
    } catch (error) {
      // Error is handled in the store
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Register New Contract</h3>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Contract Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
                placeholder="e.g., MockDeFi"
              />
              {validationErrors.name && (
                <p className="mt-2 text-sm text-destructive">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Network
              </label>
              <select
                value={formData.network}
                onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
              >
                <option value="">Select network</option>
                {availableNetworks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
              {validationErrors.network && (
                <p className="mt-2 text-sm text-destructive">{validationErrors.network}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Contract Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1 font-mono"
                placeholder="0x..."
              />
              {validationErrors.address && (
                <p className="mt-2 text-sm text-destructive">{validationErrors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                ABI (JSON)
              </label>
              <textarea
                value={formData.abi}
                onChange={(e) => setFormData({ ...formData, abi: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1 font-mono resize-none"
                placeholder='[{"inputs": [...], "name": "...", "type": "function"}]'
              />
              {validationErrors.abi && (
                <p className="mt-2 text-sm text-destructive">{validationErrors.abi}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-muted-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Registering...' : 'Register Contract'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
