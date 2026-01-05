'use client';

import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { ContractRegistrationModal } from './ContractRegistrationModal';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Card } from '@/components/shared/Card';
import { InfoTooltip } from '@/components/shared/InfoTooltip';

export function ContractRegistry() {
  const { registeredContracts, isLoading, error } = useStore((state) => state.systemSetup);
  const fetchContracts = useStore((state) => state.fetchContracts);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card title="Registered Contracts" className="p-3 sm:p-4 md:p-6">
      <div className="space-y-3 sm:space-y-4">
        {/* Header - Responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              Contracts <span className="text-muted-foreground">({registeredContracts.length})</span>
            </h3>
            {registeredContracts.length > 0 && (
              <Badge variant="info" className="text-xs">
                {registeredContracts.length} {registeredContracts.length === 1 ? 'contract' : 'contracts'}
              </Badge>
            )}
          </div>
          <Button
            onClick={() => setShowModal(true)}
            size="sm"
            variant="primary"
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">+ Register New Contract</span>
            <span className="sm:hidden">+ Register Contract</span>
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3 text-destructive text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-2 sm:space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-lg h-16 sm:h-20"></div>
            ))}
          </div>
        ) : registeredContracts.length === 0 ? (
          /* Empty State - Responsive */
          <div className="text-center py-8 sm:py-12 px-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <div className="max-w-sm mx-auto space-y-3 sm:space-y-4">
              <div className="text-3xl sm:text-4xl">📄</div>
              <div>
                <h4 className="text-sm sm:text-base font-medium text-foreground mb-1 sm:mb-2">
                  No Contracts Registered
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 px-2">
                  Register your first smart contract to start simulating transactions.
                </p>
                <Button
                  onClick={() => setShowModal(true)}
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <span className="hidden sm:inline">Register Your First Contract</span>
                  <span className="sm:hidden">Register Contract</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Contract List - Responsive */
          <div className="space-y-2 sm:space-y-3">
            {registeredContracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-background border border-border rounded-lg p-3 sm:p-4 hover:border-primary/30 transition-colors"
              >
                {/* Mobile: Stacked layout, Desktop: Side by side */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Contract Name and Network */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {contract.name}
                      </h4>
                      <Badge variant="info" className="text-xs w-fit">
                        {contract.network}
                      </Badge>
                    </div>
                    
                    {/* Address and ABI Info */}
                    <div className="space-y-1.5 sm:space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded break-all sm:break-normal">
                          {formatAddress(contract.address)}
                        </code>
                        <InfoTooltip content={contract.address} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contract.abi.length} {contract.abi.length === 1 ? 'function' : 'functions'} in ABI
                      </div>
                    </div>
                  </div>
                  
                  {/* Date - Responsive positioning */}
                  <div className="text-xs text-muted-foreground sm:whitespace-nowrap sm:flex-shrink-0">
                    <span className="hidden sm:inline">{formatDate(contract.createdAt)}</span>
                    <span className="sm:hidden">
                      {new Date(contract.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <ContractRegistrationModal onClose={() => setShowModal(false)} />
        )}
      </div>
    </Card>
  );
}
