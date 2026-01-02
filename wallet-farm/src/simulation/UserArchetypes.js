/**
 * UserArchetypes - Defines behavioral patterns for different user types
 *
 * Provides predefined archetypes that simulate realistic user interactions
 * with smart contracts based on typical user behaviors.
 */
export class UserArchetypes {
  constructor(options = {}) {
    this.options = {
      customArchetypes: options.customArchetypes || {},
      ...options
    };

    // Base archetypes with comprehensive behavior patterns
    this.archetypes = {
      whale: {
        name: 'whale',
        description: 'High-value user making infrequent large transactions',
        frequency: 'veryLow',
        volume: 'veryHigh',
        delayMin: 300000,  // 5 minutes
        delayMax: 1800000, // 30 minutes
        transactionSize: { min: 10, max: 1000 },
        skipProbability: 0.85, // 85% chance to skip interactions
        burstBehavior: {
          enabled: false, // Whales typically don't burst
          burstSize: 1,
          burstFrequency: 0
        },
        contractInteractions: {
          preferredFunctions: ['stake', 'deposit', 'largeTransfer'],
          avoidFunctions: ['claim', 'withdrawSmall'],
          parameterVariation: 'high' // Varied large amounts
        },
        timingPatterns: {
          sessionLength: { min: 600000, max: 3600000 }, // 10min to 1hr
          interActionDelay: 'slow',
          decisionTime: 'thoughtful'
        }
      },

      activeTrader: {
        name: 'activeTrader',
        description: 'Frequent trader making many medium-sized transactions',
        frequency: 'high',
        volume: 'medium',
        delayMin: 8000,   // 8 seconds
        delayMax: 60000,  // 1 minute
        transactionSize: { min: 0.1, max: 10 },
        skipProbability: 0.05, // 5% chance to skip
        burstBehavior: {
          enabled: true,
          burstSize: { min: 3, max: 8 },
          burstFrequency: 0.4, // 40% chance of burst behavior
          interBurstDelay: 'normal'
        },
        contractInteractions: {
          preferredFunctions: ['swap', 'trade', 'transfer'],
          avoidFunctions: ['stake', 'lock'],
          parameterVariation: 'medium'
        },
        timingPatterns: {
          sessionLength: { min: 300000, max: 1800000 }, // 5min to 30min
          interActionDelay: 'quick',
          decisionTime: 'normal'
        }
      },

      casual: {
        name: 'casual',
        description: 'Occasional user with moderate activity',
        frequency: 'medium',
        volume: 'low',
        delayMin: 30000,  // 30 seconds
        delayMax: 300000, // 5 minutes
        transactionSize: { min: 0.01, max: 1 },
        skipProbability: 0.2, // 20% chance to skip
        burstBehavior: {
          enabled: false,
          burstSize: 2,
          burstFrequency: 0.1 // 10% chance of small bursts
        },
        contractInteractions: {
          preferredFunctions: ['claim', 'withdraw', 'smallTransfer'],
          avoidFunctions: ['largeStake', 'complexTrade'],
          parameterVariation: 'low'
        },
        timingPatterns: {
          sessionLength: { min: 120000, max: 600000 }, // 2min to 10min
          interActionDelay: 'normal',
          decisionTime: 'normal'
        }
      },

      lurker: {
        name: 'lurker',
        description: 'Rarely active user, mostly observes',
        frequency: 'veryLow',
        volume: 'veryLow',
        delayMin: 1800000, // 30 minutes
        delayMax: 7200000, // 2 hours
        transactionSize: { min: 0.001, max: 0.1 },
        skipProbability: 0.95, // 95% chance to skip
        burstBehavior: {
          enabled: false,
          burstSize: 1,
          burstFrequency: 0.01 // Very rare bursts
        },
        contractInteractions: {
          preferredFunctions: ['claimRewards', 'checkBalance'],
          avoidFunctions: ['stake', 'trade', 'largeTransfer'],
          parameterVariation: 'minimal'
        },
        timingPatterns: {
          sessionLength: { min: 30000, max: 120000 }, // 30sec to 2min
          interActionDelay: 'verySlow',
          decisionTime: 'slow'
        }
      },

      researcher: {
        name: 'researcher',
        description: 'Analytical user studying contract behavior',
        frequency: 'low',
        volume: 'veryLow',
        delayMin: 120000,  // 2 minutes
        delayMax: 600000,  // 10 minutes
        transactionSize: { min: 0.0001, max: 0.01 },
        skipProbability: 0.3, // 30% chance to skip
        burstBehavior: {
          enabled: false,
          burstSize: 1,
          burstFrequency: 0.05
        },
        contractInteractions: {
          preferredFunctions: ['readOnly', 'viewFunctions', 'smallTest'],
          avoidFunctions: ['largeTransfer', 'stake'],
          parameterVariation: 'experimental' // Tests edge cases
        },
        timingPatterns: {
          sessionLength: { min: 600000, max: 1800000 }, // 10min to 30min
          interActionDelay: 'thoughtful',
          decisionTime: 'deliberate'
        }
      },

      bot: {
        name: 'bot',
        description: 'Automated behavior (for comparison/testing)',
        frequency: 'veryHigh',
        volume: 'low',
        delayMin: 1000,  // 1 second
        delayMax: 2000,  // 2 seconds
        transactionSize: { min: 0.001, max: 0.01 },
        skipProbability: 0.0, // Never skips
        burstBehavior: {
          enabled: true,
          burstSize: { min: 10, max: 50 },
          burstFrequency: 0.8,
          interBurstDelay: 'quick'
        },
        contractInteractions: {
          preferredFunctions: ['any'],
          avoidFunctions: [],
          parameterVariation: 'predictable'
        },
        timingPatterns: {
          sessionLength: { min: 3600000, max: 3600000 }, // Exactly 1 hour
          interActionDelay: 'instant',
          decisionTime: 'instant'
        }
      }
    };

    // Merge custom archetypes
    Object.assign(this.archetypes, this.options.customArchetypes);
  }

  /**
   * Gets a complete archetype configuration
   *
   * @param {string} archetypeName - Name of the archetype
   * @returns {Object} Archetype configuration
   */
  getArchetype(archetypeName) {
    const archetype = this.archetypes[archetypeName];
    if (!archetype) {
      throw new Error(`Unknown archetype: ${archetypeName}. Available: ${this.getArchetypeNames().join(', ')}`);
    }
    return { ...archetype };
  }

  /**
   * Gets archetype timing configuration
   *
   * @param {string} archetypeName - Name of the archetype
   * @returns {Object} Timing configuration
   */
  getTimingConfig(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return {
      delayMin: archetype.delayMin,
      delayMax: archetype.delayMax,
      interActionDelay: archetype.timingPatterns.interActionDelay,
      decisionTime: archetype.timingPatterns.decisionTime,
      sessionLength: archetype.timingPatterns.sessionLength
    };
  }

  /**
   * Determines if an archetype should skip the current interaction
   *
   * @param {string} archetypeName - Name of the archetype
   * @returns {boolean} True if should skip
   */
  shouldSkipInteraction(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return Math.random() < archetype.skipProbability;
  }

  /**
   * Generates transaction size based on archetype
   *
   * @param {string} archetypeName - Name of the archetype
   * @param {Object} [constraints] - Size constraints to override defaults
   * @returns {number} Transaction size
   */
  generateTransactionSize(archetypeName, constraints = {}) {
    const archetype = this.getArchetype(archetypeName);
    const config = constraints.size || archetype.transactionSize;

    const range = config.max - config.min;
    const random = Math.random();

    // Apply distribution based on archetype
    let size;
    switch (archetype.volume) {
      case 'veryLow':
        size = config.min + (random * range * 0.3); // Lower 30% of range
        break;
      case 'low':
        size = config.min + (random * range * 0.5); // Lower 50% of range
        break;
      case 'medium':
        size = config.min + (random * range * 0.7); // Lower 70% of range
        break;
      case 'high':
        size = config.min + (random * range * 0.9); // Lower 90% of range
        break;
      case 'veryHigh':
        size = config.min + (random * range); // Full range
        break;
      default:
        size = config.min + (random * range);
    }

    return Math.max(config.min, Math.min(config.max, size));
  }

  /**
   * Determines if archetype should use burst behavior
   *
   * @param {string} archetypeName - Name of the archetype
   * @returns {boolean} True if should burst
   */
  shouldBurst(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return archetype.burstBehavior.enabled &&
           Math.random() < archetype.burstBehavior.burstFrequency;
  }

  /**
   * Gets burst configuration for archetype
   *
   * @param {string} archetypeName - Name of the archetype
   * @returns {Object} Burst configuration
   */
  getBurstConfig(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    const burst = archetype.burstBehavior;

    return {
      burstSize: typeof burst.burstSize === 'object' ?
        Math.floor(Math.random() * (burst.burstSize.max - burst.burstSize.min)) + burst.burstSize.min :
        burst.burstSize,
      interBurstDelay: burst.interBurstDelay || 'normal'
    };
  }

  /**
   * Gets preferred contract functions for archetype
   *
   * @param {string} archetypeName - Name of the archetype
   * @returns {Array<string>} Preferred function names
   */
  getPreferredFunctions(archetypeName) {
    const archetype = this.getArchetype(archetypeName);
    return [...archetype.contractInteractions.preferredFunctions];
  }

  /**
   * Checks if a function is suitable for the archetype
   *
   * @param {string} archetypeName - Name of the archetype
   * @param {string} functionName - Contract function name
   * @returns {boolean} True if suitable
   */
  isFunctionSuitable(archetypeName, functionName) {
    const archetype = this.getArchetype(archetypeName);
    const interactions = archetype.contractInteractions;

    // Check if explicitly preferred
    if (interactions.preferredFunctions.includes(functionName) ||
        interactions.preferredFunctions.includes('any')) {
      return true;
    }

    // Check if should avoid
    if (interactions.avoidFunctions.includes(functionName)) {
      return false;
    }

    // For researchers, allow experimental functions
    if (archetype.name === 'researcher' && interactions.parameterVariation === 'experimental') {
      return Math.random() > 0.5; // 50% chance for experimental users
    }

    // Default to allowing common functions
    return ['transfer', 'swap', 'deposit', 'withdraw', 'claim'].includes(functionName);
  }

  /**
   * Generates interaction parameters based on archetype
   *
   * @param {string} archetypeName - Name of the archetype
   * @param {string} functionName - Contract function name
   * @param {Array} baseParams - Base parameters to modify
   * @returns {Array} Modified parameters
   */
  generateParameters(archetypeName, functionName, baseParams) {
    const archetype = this.getArchetype(archetypeName);
    const variation = archetype.contractInteractions.parameterVariation;

    return baseParams.map((param, index) => {
      switch (variation) {
        case 'minimal':
          return param; // No variation

        case 'low':
          return this.#applyLowVariation(param, index);

        case 'medium':
          return this.#applyMediumVariation(param, index);

        case 'high':
          return this.#applyHighVariation(param, index);

        case 'experimental':
          return this.#applyExperimentalVariation(param, index);

        case 'predictable':
          return param; // Bots are predictable

        default:
          return param;
      }
    });
  }

  /**
   * Gets all available archetype names
   *
   * @returns {Array<string>} Array of archetype names
   */
  getArchetypeNames() {
    return Object.keys(this.archetypes);
  }

  /**
   * Adds a custom archetype
   *
   * @param {string} name - Archetype name
   * @param {Object} config - Archetype configuration
   */
  addArchetype(name, config) {
    if (!name || typeof name !== 'string') {
      throw new Error('Archetype name must be a non-empty string');
    }

    // Validate required fields
    const requiredFields = ['frequency', 'volume', 'delayMin', 'delayMax', 'transactionSize'];
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
      throw new Error(`Archetype config missing required fields: ${missingFields.join(', ')}`);
    }

    // Set defaults for optional fields
    const archetype = {
      name,
      description: config.description || `${name} user archetype`,
      skipProbability: config.skipProbability || 0.1,
      burstBehavior: config.burstBehavior || { enabled: false },
      contractInteractions: config.contractInteractions || {
        preferredFunctions: ['transfer'],
        avoidFunctions: [],
        parameterVariation: 'medium'
      },
      timingPatterns: config.timingPatterns || {
        sessionLength: { min: 60000, max: 300000 },
        interActionDelay: 'normal',
        decisionTime: 'normal'
      },
      ...config
    };

    this.archetypes[name] = archetype;
  }

  /**
   * Gets archetype statistics and comparisons
   *
   * @returns {Object} Archetype comparison data
   */
  getArchetypeStats() {
    const stats = {};

    for (const [name, archetype] of Object.entries(this.archetypes)) {
      stats[name] = {
        name: archetype.name,
        frequency: archetype.frequency,
        volume: archetype.volume,
        avgDelay: (archetype.delayMin + archetype.delayMax) / 2,
        skipRate: archetype.skipProbability * 100,
        avgTransactionSize: (archetype.transactionSize.min + archetype.transactionSize.max) / 2,
        burstEnabled: archetype.burstBehavior.enabled
      };
    }

    return stats;
  }

  /**
   * Applies low parameter variation
   * @private
   * @param {*} param - Original parameter
   * @param {number} index - Parameter index
   * @returns {*} Modified parameter
   */
  #applyLowVariation(param, index) {
    if (typeof param === 'number') {
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      return param * (1 + variation);
    }
    return param;
  }

  /**
   * Applies medium parameter variation
   * @private
   * @param {*} param - Original parameter
   * @param {number} index - Parameter index
   * @returns {*} Modified parameter
   */
  #applyMediumVariation(param, index) {
    if (typeof param === 'number') {
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      return param * (1 + variation);
    }
    return param;
  }

  /**
   * Applies high parameter variation
   * @private
   * @param {*} param - Original parameter
   * @param {number} index - Parameter index
   * @returns {*} Modified parameter
   */
  #applyHighVariation(param, index) {
    if (typeof param === 'number') {
      const variation = (Math.random() - 0.5) * 0.6; // ±30% variation
      return param * (1 + variation);
    }
    return param;
  }

  /**
   * Applies experimental parameter variation (edge cases)
   * @private
   * @param {*} param - Original parameter
   * @param {number} index - Parameter index
   * @returns {*} Modified parameter
   */
  #applyExperimentalVariation(param, index) {
    if (typeof param === 'number') {
      // Experimental: sometimes use extreme values
      if (Math.random() < 0.1) { // 10% chance
        const extreme = Math.random() < 0.5 ? 0.01 : 10; // Very small or very large
        return param * extreme;
      }
      const variation = (Math.random() - 0.5) * 0.8; // ±40% variation
      return param * (1 + variation);
    }
    return param;
  }
}

export default UserArchetypes;
