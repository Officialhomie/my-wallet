'use client';

import { useStore } from '@/store';
import { selectCanStart } from '@/store/selectors/executionSelectors';
import Link from 'next/link';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import './ExecutionEligibilityGate.css';

/**
 * Displays configuration errors when simulation cannot start.
 * Only renders when status is 'idle' and configuration is invalid.
 */
export function ExecutionEligibilityGate(): JSX.Element | null {
  // Get current execution status
  const status = useStore((state) => state.executionControl.status);

  // Get configuration validity and errors
  const { isValid, validationErrors } = useStore((state) => state.simulationConfig);

  // Get derived canStart state for consistency
  const canStart = useStore(selectCanStart);

  // Only show when idle and invalid (complements canStart logic)
  if (status !== 'idle' || isValid) {
    return null;
  }

  // Get missing steps from validation errors
  const missingSteps = getMissingSteps(validationErrors);

  return (
    <Card variant="error" className="execution-eligibility-gate">
      <div className="gate-header">
        <h3>⚠️ Cannot Start Simulation</h3>
        <p>Please complete the following steps to enable simulation:</p>
      </div>

      <div className="missing-steps">
        <ul className="step-list">
          {missingSteps.map((step, index) => (
            <li key={step.step} className="step-item">
              <div className="step-number">{index + 1}</div>
              <div className="step-content">
                <strong>{step.step}</strong>
                <br />
                <small className="step-description">{step.description}</small>
                {step.action && (
                  <>
                    <br />
                    <small className="step-action">{step.action}</small>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="gate-actions">
        <Link href="/configure">
          <Button variant="primary" size="lg">
            Go to Configuration →
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/**
 * Converts validation errors into user-friendly missing steps.
 */
function getMissingSteps(validationErrors: string[]): Array<{ step: string; description: string; action?: string }> {
  const missingSteps: Array<{ step: string; description: string; action?: string }> = [];

  // Contract selection
  if (validationErrors.some(e => e.includes('Contract must be selected'))) {
    missingSteps.push({
      step: 'Contract Selection',
      description: 'No contract has been selected',
      action: 'Go to Configure → Select a contract'
    });
  }

  // Method selection
  if (validationErrors.some(e => e.includes('Method must be selected'))) {
    missingSteps.push({
      step: 'Method Selection',
      description: 'No method has been selected',
      action: 'Go to Configure → Select a method from the contract'
    });
  }

  // Method parameters
  const missingParams = validationErrors.filter(e => e.includes('Parameter') && e.includes('required'));
  if (missingParams.length > 0) {
    missingSteps.push({
      step: 'Method Parameters',
      description: `${missingParams.length} parameter${missingParams.length > 1 ? 's' : ''} need${missingParams.length === 1 ? 's' : ''} to be filled`,
      action: 'Go to Configure → Fill in all method parameters'
    });
  }

  // Wallet selection
  if (validationErrors.some(e => e.includes('wallet must be selected') || e.includes('At least one wallet'))) {
    missingSteps.push({
      step: 'Wallet Selection',
      description: 'No wallets have been selected for the simulation',
      action: 'Go to Configure → Select at least one wallet'
    });
  }

  // Archetype configuration
  if (validationErrors.some(e => e.includes('archetype percentages must sum to 100%'))) {
    missingSteps.push({
      step: 'Archetype Configuration',
      description: 'Mixed archetype percentages must sum to 100%',
      action: 'Go to Configure → Adjust archetype percentages'
    });
  }

  // Gas constraints
  if (validationErrors.some(e => e.includes('gas') && e.includes('required'))) {
    missingSteps.push({
      step: 'Gas Constraints',
      description: 'Gas constraint values are missing',
      action: 'Go to Configure → Set gas constraints or disable them'
    });
  }

  return missingSteps;
}
