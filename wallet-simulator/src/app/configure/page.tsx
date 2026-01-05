// Domain 2: Simulation Configuration Page
// How should this behave?

'use client';

import { ContractMethodSelector } from '@/components/domain-2-config/ContractMethodSelector';
import { ArchetypeConfigurator } from '@/components/domain-2-config/ArchetypeConfigurator';
import { WalletSelector } from '@/components/domain-2-config/WalletSelector';
import { ExecutionParameters } from '@/components/domain-2-config/ExecutionParameters';
import { MethodParameterForm } from '@/components/domain-2-config/MethodParameterForm';
import { ConfigSummary } from '@/components/domain-2-config/ConfigSummary';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import Link from 'next/link';
import { useStore } from '@/store';

// Helper function to identify missing configuration steps
function getMissingSteps(validationErrors: string[], config: any) {
  const missingSteps: Array<{ step: string; description: string }> = [];

  // Check for contract selection
  if (validationErrors.some(e => e.includes('Contract must be selected'))) {
    missingSteps.push({
      step: 'Contract Selection',
      description: 'Select a contract from the Contract & Method section'
    });
  }

  // Check for method selection
  if (validationErrors.some(e => e.includes('Method must be selected'))) {
    missingSteps.push({
      step: 'Method Selection',
      description: 'Select a method from the selected contract'
    });
  }

  // Check for method parameters
  const missingParams = validationErrors.filter(e => e.includes('Parameter') && e.includes('required'));
  if (missingParams.length > 0) {
    missingSteps.push({
      step: 'Method Parameters',
      description: `Fill in ${missingParams.length} missing parameter${missingParams.length > 1 ? 's' : ''} in the Method Parameters section`
    });
  }

  // Check for wallet selection
  if (validationErrors.some(e => e.includes('wallet must be selected') || e.includes('At least one wallet'))) {
    missingSteps.push({
      step: 'Wallet Selection',
      description: 'Select at least one wallet in the Wallet Selection section'
    });
  }

  // Check for archetype configuration
  if (validationErrors.some(e => e.includes('archetype percentages must sum to 100%'))) {
    missingSteps.push({
      step: 'Archetype Configuration',
      description: 'Ensure mixed archetype percentages sum to exactly 100%'
    });
  }

  // Check for gas constraints
  if (validationErrors.some(e => e.includes('gas') && e.includes('required'))) {
    missingSteps.push({
      step: 'Gas Constraints',
      description: 'Complete gas constraint settings or disable them'
    });
  }

  return missingSteps;
}

export default function ConfigurePage() {
  const simulationConfig = useStore((state) => state.simulationConfig);
  const { isValid, validationErrors } = simulationConfig;
  
  const missingSteps = !isValid && validationErrors.length > 0 
    ? getMissingSteps(validationErrors, simulationConfig)
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Simulation Configuration
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          How should this behave?
        </p>
      </div>

      {/* Top Row: Contract & Archetypes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <Card title="Contract & Method">
          <ContractMethodSelector />
        </Card>

        <Card title="Behavioral Archetypes">
          <ArchetypeConfigurator />
        </Card>
      </div>

      {/* Method Parameters (conditional) */}
      <Card title="Method Parameters">
        <MethodParameterForm />
      </Card>

      {/* Middle Row: Wallets & Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <Card title="Wallet Selection">
          <WalletSelector />
        </Card>

        <Card title="Execution Parameters">
          <ExecutionParameters />
        </Card>
      </div>

      {/* Configuration Summary */}
      <Card title="Configuration Summary">
        <ConfigSummary />
      </Card>

      {/* Validation Status */}
      {!isValid && missingSteps.length > 0 && (
        <Card title="Configuration Status" className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="error" className="text-xs">
                Incomplete
              </Badge>
              <span className="text-sm text-muted-foreground">
                Please complete the following steps before proceeding:
              </span>
            </div>
            <div className="space-y-2">
              {missingSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-muted/50 border border-border rounded-lg p-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-destructive">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm mb-1">
                      {step.step}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {isValid && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Badge variant="info" className="text-xs">
              ✓ Complete
            </Badge>
            <span className="text-sm text-foreground">
              Configuration is valid. You can proceed to execution.
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Link href="/setup" className="w-full sm:w-auto">
          <Button variant="secondary" size="lg" className="w-full sm:w-auto">
            ← Back to Setup
          </Button>
        </Link>

        <div className="w-full sm:w-auto flex flex-col items-end gap-2">
          {isValid ? (
            <Link href="/execute" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Continue to Execute →
              </Button>
            </Link>
          ) : (
            <>
              <Button 
              disabled 
              size="lg" 
              variant="primary"
              className="w-full sm:w-auto opacity-50 cursor-not-allowed"
            >
              Continue to Execute →
            </Button>
            {missingSteps.length > 0 && (
              <div className="text-xs text-muted-foreground text-right w-full sm:w-auto">
                {missingSteps.length} step{missingSteps.length > 1 ? 's' : ''} remaining
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
