import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SeededRandom } from '../timing/SeededRandom.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * ArchetypeManager - Manages user archetype behaviors for simulation
 *
 * Handles loading archetype configurations from JSON, validating them,
 * and providing methods to simulate realistic user behavior patterns.
 */
export class ArchetypeManager {
  /**
   * Initialize archetype manager with seeded random generator
   *
   * @param {SeededRandom} [rng] - Seeded random number generator
   * @param {string} [configPath] - Path to archetype config file
   */
  constructor(rng = null, configPath = null) {
    // Use injected RNG or create new one
    this.rng = rng || new SeededRandom();

    // Map of archetype name -> config
    this.archetypes = new Map();

    // Load default archetypes
    const defaultConfigPath = configPath ||
      join(__dirname, '../../config/archetypes.json');
    this.loadArchetypesFromFile(defaultConfigPath);
  }

  /**
   * Load archetypes from JSON file
   *
   * @param {string} filePath - Path to JSON config file
   * @throws {Error} If file cannot be read or parsed
   */
  loadArchetypesFromFile(filePath) {
    try {
      const configData = readFileSync(filePath, 'utf-8');
      const config = JSON.parse(configData);

      if (!config.archetypes) {
        throw new Error('Config file missing "archetypes" key');
      }

      Object.entries(config.archetypes).forEach(([name, config]) => {
        this.registerArchetype(name, config);
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archetype config file not found: ${filePath}`);
      }
      throw new Error(`Failed to load archetypes: ${error.message}`);
    }
  }

  /**
   * Register a new archetype or override existing
   *
   * @param {string} name - Archetype name
   * @param {Object} config - Archetype configuration
   * @throws {Error} If config is invalid
   */
  registerArchetype(name, config) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Archetype name must be a non-empty string');
    }

    // Validate config structure
    this.#validateArchetypeConfig(config);

    this.archetypes.set(name, {
      ...config,
      registeredAt: new Date().toISOString()
    });
  }

  /**
   * Validate archetype configuration structure
   *
   * @private
   * @param {Object} config - Configuration to validate
   * @throws {Error} If config is invalid
   */
  #validateArchetypeConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Archetype config must be an object');
    }

    const required = ['frequency', 'timing', 'transactionSize'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Archetype config missing required fields: ${missing.join(', ')}`);
    }

    // Validate frequency
    if (typeof config.frequency.skipProbability !== 'number' ||
        config.frequency.skipProbability < 0 ||
        config.frequency.skipProbability > 1) {
      throw new Error('frequency.skipProbability must be number in range [0, 1]');
    }

    // Validate timing
    if (typeof config.timing.min !== 'number' ||
        typeof config.timing.max !== 'number' ||
        config.timing.min >= config.timing.max) {
      throw new Error('timing.min must be < timing.max and both must be numbers');
    }

    // Validate transactionSize
    if (typeof config.transactionSize.min !== 'number' ||
        typeof config.transactionSize.max !== 'number' ||
        config.transactionSize.min >= config.transactionSize.max) {
      throw new Error('transactionSize.min must be < transactionSize.max and both must be numbers');
    }

    // Validate distribution (optional)
    if (config.transactionSize.distribution &&
        !['powerLaw', 'uniform'].includes(config.transactionSize.distribution)) {
      throw new Error('transactionSize.distribution must be "powerLaw" or "uniform"');
    }

    // Validate exponent for power law (optional)
    if (config.transactionSize.distribution === 'powerLaw' &&
        (typeof config.transactionSize.exponent !== 'number' ||
         config.transactionSize.exponent <= 0)) {
      throw new Error('transactionSize.exponent must be positive number for powerLaw distribution');
    }
  }

  /**
   * Get archetype configuration
   *
   * @param {string} name - Archetype name
   * @returns {Object} Archetype config
   * @throws {Error} If archetype doesn't exist
   */
  getArchetype(name) {
    const archetype = this.archetypes.get(name);
    if (!archetype) {
      throw new Error(`Unknown archetype: ${name}. Available: ${this.getArchetypeNames().join(', ')}`);
    }
    return { ...archetype }; // Return copy
  }

  /**
   * Get list of all archetype names
   *
   * @returns {string[]} Archetype names
   */
  getArchetypeNames() {
    return Array.from(this.archetypes.keys());
  }

  /**
   * Determine if interaction should be skipped based on archetype
   *
   * @param {string} archetypeName - Archetype name
   * @returns {boolean} True if interaction should be skipped
   */
  shouldSkipInteraction(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    const random = this.rng.next();

    return random < archetype.frequency.skipProbability;
  }

  /**
   * Generate transaction size based on archetype distribution
   *
   * @param {string} archetypeName - Archetype name
   * @returns {number} Transaction size
   */
  generateTransactionSize(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    const { min, max, distribution, exponent } = archetype.transactionSize;

    if (distribution === 'powerLaw') {
      // Power law distribution: many small, few large
      // P(x) ∝ x^(-α) where α = exponent
      const random = this.rng.next();

      // Transform uniform random to power law
      // For exponent > 1: x = (min^(1-α) + random * (max^(1-α) - min^(1-α)))^(1/(1-α))
      const alpha = exponent;
      const minPow = Math.pow(min, 1 - alpha);
      const maxPow = Math.pow(max, 1 - alpha);
      const transformed = Math.pow(minPow + random * (maxPow - minPow), 1 / (1 - alpha));

      return Math.max(min, Math.min(max, transformed));

    } else {
      // Uniform distribution (fallback)
      return this.rng.nextFloat(min, max);
    }
  }

  /**
   * Get delay timing bounds for archetype
   *
   * @param {string} archetypeName - Archetype name
   * @returns {Object} { min, max } timing in milliseconds
   */
  getTimingBounds(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return {
      min: archetype.timing.min,
      max: archetype.timing.max
    };
  }

  /**
   * Get delay profile for archetype
   *
   * @param {string} archetypeName - Archetype name
   * @returns {string} Delay profile name
   */
  getDelayProfile(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return archetype.frequency.profile;
  }

  /**
   * Get timing configuration for archetype
   *
   * @param {string} archetypeName - Archetype name
   * @returns {Object} Timing configuration
   */
  getTimingConfig(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return { ...archetype.frequency };
  }

  /**
   * Determine if a function is suitable for an archetype
   *
   * @param {string} archetypeName - Archetype name
   * @param {string} functionName - Function name to check
   * @returns {boolean} True if function is suitable
   */
  isFunctionSuitable(archetypeName, functionName) {
    const archetype = this.getArchetype(archetypeName);

    // Check if archetype has preferred functions
    if (archetype.preferredFunctions) {
      return archetype.preferredFunctions.includes(functionName);
    }

    // Default: all functions are suitable
    return true;
  }

  /**
   * Generate parameters for a transaction based on archetype
   *
   * @param {string} archetypeName - Archetype name
   * @param {string} functionName - Function being called
   * @returns {Object} Generated parameters
   */
  generateParameters(archetypeName, functionName) {
    const archetype = this.getArchetype(archetypeName);
    const transactionSize = this.generateTransactionSize(archetypeName);

    // Basic parameter generation - can be extended for specific functions
    const params = {
      value: transactionSize,
      functionName
    };

    // Add archetype-specific parameter generation logic here
    // For now, just return basic transaction size

    return params;
  }

  /**
   * Determine if archetype should burst (perform rapid actions)
   *
   * @param {string} archetypeName - Archetype name
   * @returns {boolean} True if should burst
   */
  shouldBurst(archetypeName) {
    const archetype = this.getArchetype(archetypeName);

    // Check if archetype has burst configuration
    if (archetype.burstConfig) {
      const random = this.rng.next();
      return random < archetype.burstConfig.probability;
    }

    // Default: no bursting
    return false;
  }

  /**
   * Get burst configuration for archetype
   *
   * @param {string} archetypeName - Archetype name
   * @returns {Object|null} Burst configuration or null
   */
  getBurstConfig(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return archetype.burstConfig || null;
  }

  /**
   * Get preferred functions for archetype
   *
   * @param {string} archetypeName - Archetype name
   * @returns {string[]} Array of preferred function names
   */
  getPreferredFunctions(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return archetype.preferredFunctions || [];
  }

  /**
   * Get statistics about archetypes
   *
   * @returns {Object} Statistics about loaded archetypes
   */
  getArchetypeStats() {
    const stats = {
      totalArchetypes: this.archetypes.size,
      archetypeNames: this.getArchetypeNames(),
      timingRanges: {},
      skipProbabilities: {},
      transactionSizeRanges: {}
    };

    for (const [name, config] of this.archetypes) {
      stats.timingRanges[name] = {
        min: config.timing.min,
        max: config.timing.max
      };

      stats.skipProbabilities[name] = config.frequency.skipProbability;

      stats.transactionSizeRanges[name] = {
        min: config.transactionSize.min,
        max: config.transactionSize.max,
        distribution: config.transactionSize.distribution || 'uniform'
      };
    }

    return stats;
  }

  /**
   * Get current RNG instance
   *
   * @returns {SeededRandom} Current RNG instance
   */
  getRng() {
    return this.rng;
  }

  /**
   * Set new RNG instance
   *
   * @param {SeededRandom} rng - New RNG instance
   */
  setRng(rng) {
    if (!(rng instanceof SeededRandom)) {
      throw new Error('RNG must be an instance of SeededRandom');
    }
    this.rng = rng;
  }
}

export default ArchetypeManager;
