'use client';

import { useStore } from '@/store';
import { Input } from '@/components/shared/Input';
import { Badge } from '@/components/shared/Badge';
import { Card } from '@/components/shared/Card';

export function MethodParameterForm() {
  const { selectedMethod, methodParams, value } = useStore((state) => state.simulationConfig);
  const updateMethodParam = useStore((state) => state.updateMethodParam);
  const setValue = useStore((state) => state.setValue);

  if (!selectedMethod) {
    return (
      <Card title="Method Parameters" className="p-4 sm:p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Select a method to configure parameters</p>
        </div>
      </Card>
    );
  }

  const isPayable = selectedMethod.stateMutability === 'payable';
  const hasParameters = selectedMethod.inputs && selectedMethod.inputs.length > 0;

  return (
    <Card title="Method Parameters" className="p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Method Signature Display */}
        <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Method:</span>
                <Badge variant="info" className="text-xs">
                  {selectedMethod.stateMutability}
                </Badge>
                {isPayable && (
                  <Badge variant="warning" className="text-xs">
                    Payable
                  </Badge>
                )}
              </div>
              <code className="text-xs sm:text-sm font-mono text-foreground break-all">
                {selectedMethod.signature}
              </code>
            </div>
          </div>
        </div>

        {/* Parameter Inputs */}
        {hasParameters ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Parameters ({selectedMethod.inputs.length})
              </h4>
            </div>
            <div className="space-y-4">
              {selectedMethod.inputs.map((input, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {input.name || `Parameter ${index + 1}`}
                    </span>
                    <Badge variant="default" className="text-xs font-mono">
                      {input.type}
                    </Badge>
                  </div>
                  <Input
                    id={`param-${index}`}
                    type={getInputType(input.type)}
                    value={methodParams[input.name] || ''}
                    onChange={(e) => updateMethodParam(input.name, e.target.value)}
                    placeholder={getPlaceholder(input.type)}
                    className="font-mono text-sm"
                  />
                  {input.type === 'address' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a valid Ethereum address (0x...)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-border rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">
              This method has no parameters
            </p>
          </div>
        )}

        {/* Value Input for Payable Methods */}
        {isPayable && (
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label htmlFor="method-value" className="text-sm font-semibold text-foreground">
                Transaction Value
              </label>
              <Badge variant="warning" className="text-xs">
                Required for payable methods
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  id="method-value"
                  type="number"
                  step="0.000000000000000001"
                  min="0"
                  value={value || ''}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.0"
                  className="font-mono text-sm"
                />
              </div>
              <div className="w-full sm:w-32">
                <select 
                  defaultValue="eth"
                  className="w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
                >
                  <option value="eth">ETH</option>
                  <option value="wei">Wei</option>
                  <option value="gwei">Gwei</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Amount of native currency to send with this transaction
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Helper functions
function getInputType(solidityType: string): string {
  if (solidityType.includes('int') || solidityType.includes('uint')) return 'number';
  if (solidityType === 'bool') return 'checkbox';
  if (solidityType === 'address') return 'text';
  return 'text';
}

function getPlaceholder(solidityType: string): string {
  if (solidityType === 'address') return '0x...';
  if (solidityType.includes('uint') || solidityType.includes('int')) return '0';
  if (solidityType === 'bool') return '';
  return '';
}
