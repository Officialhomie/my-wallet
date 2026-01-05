// Domain 1: System Setup Page
// What am I testing?

import { NetworkSelector } from '@/components/domain-1-setup/NetworkSelector';
import { WalletFarmInfo } from '@/components/domain-1-setup/WalletFarmInfo';
import { ContractRegistry } from '@/components/domain-1-setup/ContractRegistry';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import Link from 'next/link';

export default function SetupPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          System Setup
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          What am I testing?
        </p>
      </div>

      <Card title="Network Configuration">
        <NetworkSelector />
      </Card>

      <Card title="Wallet Farm">
        <WalletFarmInfo />
      </Card>

      <Card title="Contract Registry">
        <ContractRegistry />
      </Card>

      <div className="flex justify-end">
        <Link href="/configure" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            Continue to Configure →
          </Button>
        </Link>
      </div>
    </div>
  );
}
