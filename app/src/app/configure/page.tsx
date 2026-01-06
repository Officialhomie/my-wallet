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
        <p className="text-base sm:text-lg text-muted-foreground mb-3">
          How should this behave?
        </p>
        <div className="inline-flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground">Fields marked with</span>
          <span className="text-destructive text-sm font-bold">*</span>
          <span className="text-xs text-muted-foreground">are required for execution</span>
        </div>
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

      {/* Validation Status - Made More Prominent */}
      {!isValid && missingSteps.length > 0 && (
        <Card title="⚠️ Configuration Incomplete" className="p-4 sm:p-6 border-destructive/50 bg-destructive/5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="error" className="text-xs font-semibold animate-pulse">
                ⚠️ REQUIRED
              </Badge>
              <span className="text-sm text-foreground font-medium">
                Complete these {missingSteps.length} step{missingSteps.length > 1 ? 's' : ''} to enable execution:
              </span>
            </div>
            <div className="space-y-3">
              {missingSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                    <span className="text-sm font-bold text-destructive-foreground">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm mb-1">
                      {step.step} <span className="text-destructive">*</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-destructive/20 border border-destructive/30 rounded-lg p-3 mt-4">
              <p className="text-sm text-destructive font-medium">
                🔒 "Continue to Execute" is disabled until all required fields are completed.
              </p>
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
              className="w-full sm:w-auto opacity-60 cursor-not-allowed relative overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Continue to Execute →
              </div>
              {/* Strikethrough effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-destructive rotate-12 opacity-80"></div>
              </div>
            </Button>
            {missingSteps.length > 0 && (
              <div className="text-xs text-destructive font-medium text-right w-full sm:w-auto bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
                🔒 {missingSteps.length} required step{missingSteps.length > 1 ? 's' : ''} remaining
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
