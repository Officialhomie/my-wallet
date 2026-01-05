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
import Link from 'next/link';
import { useStore } from '@/store';

export default function ConfigurePage() {
  const { isValid, validationErrors } = useStore((state) => state.simulationConfig);

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

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="font-semibold text-red-900 mb-2">Configuration Errors</h3>
          <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Link href="/setup" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto">
            ← Back to Setup
          </Button>
        </Link>

        <Link href="/execute" className="w-full sm:w-auto">
          <Button disabled={!isValid} className="w-full sm:w-auto">
            Continue to Execute →
          </Button>
        </Link>
      </div>
    </div>
  );
}
