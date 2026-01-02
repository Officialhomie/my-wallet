'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useSimulationStore } from '@/lib/store';
import { ABIFunction, AbiValidationResult } from '@/types/api';
import { cn } from '@/utils/cn';

interface ContractABIProps {
  className?: string;
}

export function ContractABI({ className }: ContractABIProps) {
  const { config, setConfig } = useSimulationStore();
  const [contractAddress, setContractAddress] = useState(config.contractAddress || '');
  const [abiText, setAbiText] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<AbiValidationResult | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContractAddressChange = useCallback((value: string) => {
    setContractAddress(value);
    setConfig({ contractAddress: value });
  }, [setConfig]);

  const handleAbiTextChange = useCallback((value: string) => {
    setAbiText(value);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAbiText(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const validateAbi = useCallback(async () => {
    if (!abiText.trim()) return;

    setIsValidating(true);
    try {
      let abi;
      try {
        abi = JSON.parse(abiText);
      } catch (error) {
        setValidationResult({
          valid: false,
          errors: ['Invalid JSON format'],
          warnings: [],
          functions: [],
          events: [],
        });
        return;
      }

      if (!Array.isArray(abi)) {
        setValidationResult({
          valid: false,
          errors: ['ABI must be an array'],
          warnings: [],
          functions: [],
          events: [],
        });
        return;
      }

      // Simple validation - in production this would call the backend API
      const functions = abi.filter(item => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure');
      const events = abi.filter(item => item.type === 'event');

      setValidationResult({
        valid: true,
        errors: [],
        warnings: [],
        functions,
        events,
      });

      if (functions.length > 0) {
        setConfig({ abi, abiHash: generateAbiHash(abi) });
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        functions: [],
        events: [],
      });
    } finally {
      setIsValidating(false);
    }
  }, [abiText, setConfig]);

  const generateAbiHash = (abi: any[]): string => {
    // Simple hash function for demo
    const abiString = JSON.stringify(abi);
    let hash = 0;
    for (let i = 0; i < abiString.length; i++) {
      const char = abiString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  };

  const handleFunctionToggle = useCallback((functionName: string) => {
    const newSelected = new Set(selectedFunctions);
    if (newSelected.has(functionName)) {
      newSelected.delete(functionName);
    } else {
      newSelected.add(functionName);
    }
    setSelectedFunctions(newSelected);

    // Update config with selected functions
    if (validationResult?.functions) {
      const targetFunctions = validationResult.functions
        .filter(func => newSelected.has(func.name))
        .map(func => ({
          name: func.name,
          inputs: func.inputs.map(input => ({
            name: input.name,
            type: input.type,
          })),
          selected: true,
        }));

      setConfig({ targetFunctions });
    }
  }, [selectedFunctions, validationResult, setConfig]);

  const isContractAddressValid = /^0x[a-fA-F0-9]{40}$/.test(contractAddress);
  const hasAbi = Boolean(abiText.trim());
  const isAbiValid = validationResult?.valid;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contract & ABI Configuration</h3>

        {/* Contract Address */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Contract Address</label>
          <div className="relative">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => handleContractAddressChange(e.target.value)}
              placeholder="0x..."
              className={cn(
                'w-full px-3 py-2 bg-card border rounded-md text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                isContractAddressValid
                  ? 'border-green-500 text-green-600'
                  : contractAddress && !isContractAddressValid
                  ? 'border-red-500 text-red-600'
                  : 'border-border'
              )}
            />
            {contractAddress && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isContractAddressValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          {contractAddress && !isContractAddressValid && (
            <p className="text-xs text-red-500">Invalid Ethereum address format</p>
          )}
        </div>

        {/* ABI Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">ABI</label>

          {/* Upload/Paste Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload JSON</span>
            </button>
            <button
              onClick={() => setAbiText('')}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Paste Text</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <textarea
            value={abiText}
            onChange={(e) => handleAbiTextChange(e.target.value)}
            placeholder="Paste your ABI JSON here..."
            rows={8}
            className={cn(
              'w-full px-3 py-2 bg-card border rounded-md text-sm font-mono',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'resize-none',
              hasAbi
                ? isAbiValid
                  ? 'border-green-500'
                  : validationResult?.errors.length
                  ? 'border-red-500'
                  : 'border-border'
                : 'border-border'
            )}
          />

          {/* Validation Button */}
          <button
            onClick={validateAbi}
            disabled={!hasAbi || isValidating}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              hasAbi && !isValidating
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isValidating ? 'Validating...' : 'Validate ABI'}
          </button>

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-2">
              {validationResult.errors.length > 0 && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-700">Validation Errors:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {validationResult.valid && validationResult.functions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-medium text-green-700">ABI Validated Successfully</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Select Target Functions:</p>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {validationResult.functions
                        .filter((func: ABIFunction) => func.type === 'function' && func.stateMutability !== 'view' && func.stateMutability !== 'pure')
                        .map((func: ABIFunction) => (
                          <div
                            key={func.name}
                            className={cn(
                              'flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-colors',
                              selectedFunctions.has(func.name)
                                ? 'bg-primary/10 border-primary'
                                : 'bg-card border-border hover:border-primary/50'
                            )}
                            onClick={() => handleFunctionToggle(func.name)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedFunctions.has(func.name)}
                              onChange={() => handleFunctionToggle(func.name)}
                              className="rounded border-border"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{func.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {func.inputs.length} inputs • {func.stateMutability}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
