'use client';

import { useStore } from '@/store';
import { useEffect } from 'react';
import { AbiItem } from '@/types/domain-2';

export function ContractMethodSelector() {
  const { systemSetup, simulationConfig } = useStore();
  const selectContract = useStore((state) => state.selectContract);
  const selectMethod = useStore((state) => state.selectMethod);

  const contracts = systemSetup.registeredContracts;
  const { selectedContract, selectedMethod } = simulationConfig;

  // Get methods from selected contract
  const methods = selectedContract?.abi
    .filter((item: AbiItem) => item.type === 'function' && item.name)
    .map((item: AbiItem) => ({
      name: item.name!,
      signature: `${item.name}(${item.inputs?.map((i) => i.type).join(',') || ''})`,
      inputs: item.inputs || [],
      stateMutability: item.stateMutability || 'nonpayable',
    })) || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Contract
        </label>
        <select
          value={selectedContract?.id || ''}
          onChange={(e) => {
            const contract = contracts.find(c => c.id === e.target.value);
            selectContract(contract || null);
          }}
          className="block w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
        >
          <option value="">Select contract</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.name} ({contract.address.slice(0, 6)}...{contract.address.slice(-4)})
            </option>
          ))}
        </select>
      </div>

      {selectedContract && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Method
          </label>
          <select
            value={selectedMethod?.signature || ''}
            onChange={(e) => {
              const method = methods.find(m => m.signature === e.target.value);
              selectMethod(method || null);
            }}
            className="block w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1 font-mono"
          >
            <option value="">Select method</option>
            {methods.map((method) => {
              const mutabilityLabel = method.stateMutability === 'view' || method.stateMutability === 'pure' 
                ? ' [READ]' 
                : ' [WRITE]';
              return (
                <option key={method.signature} value={method.signature}>
                  {method.signature}{mutabilityLabel}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
}
