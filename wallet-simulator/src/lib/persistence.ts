// Data persistence utilities for localStorage
// Handles saving/loading user preferences and configuration

import { SimulationConfigState } from '@/types/domain-2';
import { SystemSetupState } from '@/types/domain-1';
import { SimulationSummary } from '@/types/domain-6';

const STORAGE_KEYS = {
  USER_PREFERENCES: 'wallet-simulator-preferences',
  SIMULATION_CONFIG: 'wallet-simulator-config',
  SYSTEM_SETUP: 'wallet-simulator-setup',
  LAST_SIMULATION: 'wallet-simulator-last-simulation',
} as const;

// Stored data interfaces with metadata
interface StoredDataWithMetadata<T> {
  savedAt: string;
  [key: string]: T | string | unknown;
}

interface StoredSimulationConfig extends StoredDataWithMetadata<SimulationConfigState> {
  savedAt: string;
}

interface StoredSystemSetup extends StoredDataWithMetadata<SystemSetupState> {
  savedAt: string;
}

interface StoredLastSimulation extends StoredDataWithMetadata<SimulationSummary> {
  simulationId: string;
  summary: SimulationSummary;
  savedAt: string;
}

interface ImportedData {
  preferences?: Partial<UserPreferences>;
  simulationConfig?: StoredSimulationConfig;
  systemSetup?: StoredSystemSetup;
  lastSimulation?: StoredLastSimulation;
  exportedAt?: string;
}

// User preferences interface
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  autoSave?: boolean;
  showTooltips?: boolean;
  defaultNetwork?: string;
  defaultWalletCount?: number;
  exportFormat?: 'json' | 'csv';
  lastVisitedPage?: string;
}

// Default preferences
const DEFAULT_PREFERENCES: Required<UserPreferences> = {
  theme: 'system',
  autoSave: true,
  showTooltips: true,
  defaultNetwork: 'sepolia',
  defaultWalletCount: 10,
  exportFormat: 'json',
  lastVisitedPage: '/',
};

// Persistence class
class PersistenceManager {
  // Generic storage methods
  private setItem<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.warn(`Failed to save to localStorage (${key}):`, error);
    }
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;

      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to load from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  private removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage (${key}):`, error);
    }
  }

  // User preferences
  savePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getItem<Partial<UserPreferences>>(STORAGE_KEYS.USER_PREFERENCES, {});
    const updated: Partial<UserPreferences> = { ...current, ...preferences };
    this.setItem(STORAGE_KEYS.USER_PREFERENCES, updated);
  }

  loadPreferences(): UserPreferences {
    const saved = this.getItem<Partial<UserPreferences>>(STORAGE_KEYS.USER_PREFERENCES, {});
    return { ...DEFAULT_PREFERENCES, ...saved };
  }

  resetPreferences(): void {
    this.removeItem(STORAGE_KEYS.USER_PREFERENCES);
  }

  // Simulation configuration
  saveSimulationConfig(config: SimulationConfigState): void {
    const preferences = this.loadPreferences();
    if (!preferences.autoSave) return;

    const stored: StoredSimulationConfig = {
      ...config,
      savedAt: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.SIMULATION_CONFIG, stored);
  }

  loadSimulationConfig(): SimulationConfigState | null {
    try {
      const saved = this.getItem<StoredSimulationConfig | null>(STORAGE_KEYS.SIMULATION_CONFIG, null);
      if (!saved || !saved.savedAt) return null;

      // Check if config is not too old (optional: expire after 7 days)
      const savedAt = new Date(saved.savedAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      if (savedAt < sevenDaysAgo) {
        this.removeItem(STORAGE_KEYS.SIMULATION_CONFIG);
        return null;
      }

      // Remove metadata before returning
      const { savedAt: _, ...config } = saved;
      return config as unknown as SimulationConfigState;
    } catch (error) {
      console.warn('Failed to load simulation config:', error);
      return null;
    }
  }

  clearSimulationConfig(): void {
    this.removeItem(STORAGE_KEYS.SIMULATION_CONFIG);
  }

  // System setup
  saveSystemSetup(setup: SystemSetupState): void {
    const preferences = this.loadPreferences();
    if (!preferences.autoSave) return;

    const stored: StoredSystemSetup = {
      ...setup,
      savedAt: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.SYSTEM_SETUP, stored);
  }

  loadSystemSetup(): SystemSetupState | null {
    try {
      const saved = this.getItem<StoredSystemSetup | null>(STORAGE_KEYS.SYSTEM_SETUP, null);
      if (!saved || !saved.savedAt) return null;

      // Check if setup is not too old (optional: expire after 30 days)
      const savedAt = new Date(saved.savedAt);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (savedAt < thirtyDaysAgo) {
        this.removeItem(STORAGE_KEYS.SYSTEM_SETUP);
        return null;
      }

      // Remove metadata before returning
      const { savedAt: _, ...setup } = saved;
      return setup as unknown as SystemSetupState;
    } catch (error) {
      console.warn('Failed to load system setup:', error);
      return null;
    }
  }

  clearSystemSetup(): void {
    this.removeItem(STORAGE_KEYS.SYSTEM_SETUP);
  }

  // Last simulation results
  saveLastSimulation(simulationId: string, summary: SimulationSummary): void {
    const stored: StoredLastSimulation = {
      simulationId,
      summary,
      savedAt: new Date().toISOString(),
    };
    this.setItem(STORAGE_KEYS.LAST_SIMULATION, stored);
  }

  loadLastSimulation(): { simulationId: string; summary: SimulationSummary } | null {
    try {
      const saved = this.getItem<StoredLastSimulation | null>(STORAGE_KEYS.LAST_SIMULATION, null);
      if (!saved || !saved.simulationId || !saved.summary) return null;

      // Remove metadata before returning
      const { savedAt: _, ...simulation } = saved;
      return {
        simulationId: simulation.simulationId,
        summary: simulation.summary,
      };
    } catch (error) {
      console.warn('Failed to load last simulation:', error);
      return null;
    }
  }

  clearLastSimulation(): void {
    this.removeItem(STORAGE_KEYS.LAST_SIMULATION);
  }

  // Clear all data
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.removeItem(key);
    });
  }

  // Export all data (for backup)
  exportAllData(): string {
    const data = {
      preferences: this.loadPreferences(),
      simulationConfig: this.loadSimulationConfig(),
      systemSetup: this.loadSystemSetup(),
      lastSimulation: this.loadLastSimulation(),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  // Import data (for restore)
  importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData) as ImportedData;

      if (data.preferences) {
        this.savePreferences(data.preferences);
      }
      if (data.simulationConfig) {
        this.setItem<StoredSimulationConfig>(STORAGE_KEYS.SIMULATION_CONFIG, data.simulationConfig);
      }
      if (data.systemSetup) {
        this.setItem<StoredSystemSetup>(STORAGE_KEYS.SYSTEM_SETUP, data.systemSetup);
      }
      if (data.lastSimulation) {
        this.setItem<StoredLastSimulation>(STORAGE_KEYS.LAST_SIMULATION, data.lastSimulation);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const persistence = new PersistenceManager();

// Hook for using persistence in components
import { useEffect, useState } from 'react';

export function usePersistedState<T>(
  key: keyof typeof STORAGE_KEYS,
  defaultValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEYS[key]);
      if (item !== null) {
        setState(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Failed to load persisted state for ${key}:`, error);
    }
  }, [key]);

  const setPersistedState = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to persist state for ${key}:`, error);
    }
  };

  return [state, setPersistedState];
}
