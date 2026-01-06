import { SeededRandom } from '../timing/SeededRandom.js';

/**
 * TimingEngine - Generates realistic human-like delays for transaction simulation
 *
 * Uses seeded random number generation for reproducible testing and applies
 * triangular distribution to cluster delays around human-like midpoints.
 */
export class TimingEngine {
  /**
   * Initialize timing engine with seeded random generator
   *
   * @param {SeededRandom} [rng] - Seeded random number generator (creates new if not provided)
   */
  constructor(rng = null) {
    // Use injected RNG or create new one
    this.rng = rng || new SeededRandom();

    // Delay profiles (in milliseconds) - clustered around human-like behaviors
    this.profiles = {
      quick: { min: 500, max: 2000, variance: 0.3 },
      normal: { min: 2000, max: 8000, variance: 0.3 },
      thoughtful: { min: 8000, max: 20000, variance: 0.4 },
      slow: { min: 20000, max: 60000, variance: 0.5 },
      verySlow: { min: 60000, max: 180000, variance: 0.6 }
    };

    // Typing speed (words per minute)
    this.typingWPM = {
      slow: 20,
      average: 40,
      fast: 60
    };
  }

  /**
   * Generate weighted random delay using triangular distribution
   *
   * Triangular distribution clusters values around the midpoint, which is
   * more realistic for human behavior than uniform distribution.
   *
   * @private
   * @param {number} min - Minimum delay in milliseconds
   * @param {number} max - Maximum delay in milliseconds
   * @returns {number} Delay in milliseconds
   */
  #weightedDelay(min, max) {
    // Triangular distribution: average of two uniform random values
    // This clusters values around the midpoint
    const r1 = this.rng.next();
    const r2 = this.rng.next();
    const avg = (r1 + r2) / 2;

    return min + (avg * (max - min));
  }

  /**
   * Apply variance to delay value
   *
   * @private
   * @param {number} delay - Base delay in milliseconds
   * @param {number} variance - Variance factor (0-1)
   * @returns {number} Delay with variance applied
   */
  #applyVariance(delay, variance) {
    const varianceFactor = 1 + ((this.rng.next() - 0.5) * 2 * variance);
    return Math.max(0, delay * varianceFactor);
  }

  /**
   * Generate human-like delay based on profile
   *
   * @param {string} profile - Delay profile name ('quick', 'normal', 'thoughtful', 'slow', 'verySlow')
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.disableVariance=false] - Disable variance application
   * @param {number} [options.multiplier=1] - Multiply delay by this factor
   * @returns {Promise<number>} Resolves after delay, returns actual delay used in milliseconds
   */
  async humanDelay(profile = 'normal', options = {}) {
    const config = this.profiles[profile];
    if (!config) {
      throw new Error(`Unknown delay profile: ${profile}. Available: ${Object.keys(this.profiles).join(', ')}`);
    }

    // Generate weighted delay (triangular distribution)
    let delay = this.#weightedDelay(config.min, config.max);

    // Apply variance if not disabled
    if (options.disableVariance !== true) {
      delay = this.#applyVariance(delay, config.variance);
    }

    // Apply multiplier if provided
    if (options.multiplier) {
      delay *= options.multiplier;
    }

    // Wait for the delay
    await new Promise(resolve => setTimeout(resolve, delay));

    return delay;
  }

  /**
   * Get delay value synchronously (for testing and calculations)
   *
   * @param {string} profile - Delay profile name
   * @param {Object} [options={}] - Additional options
   * @returns {number} Delay in milliseconds
   */
  getDelaySync(profile = 'normal', options = {}) {
    const config = this.profiles[profile];
    if (!config) {
      throw new Error(`Unknown delay profile: ${profile}`);
    }

    let delay = this.#weightedDelay(config.min, config.max);

    if (options.disableVariance !== true) {
      delay = this.#applyVariance(delay, config.variance);
    }

    if (options.multiplier) {
      delay *= options.multiplier;
    }

    return delay;
  }

  /**
   * Simulate typing delay based on text length
   *
   * @param {string} text - Text being "typed"
   * @param {string} [speed='average'] - Typing speed ('slow', 'average', 'fast')
   * @returns {Promise<number>} Resolves after delay, returns actual delay in milliseconds
   */
  async typingDelay(text, speed = 'average') {
    const wpm = this.typingWPM[speed];
    if (!wpm) {
      throw new Error(`Unknown typing speed: ${speed}. Available: ${Object.keys(this.typingWPM).join(', ')}`);
    }

    // Calculate delay: (characters / (WPM * 5)) * 60000ms
    // Assuming average word length of 5 characters
    const characters = text.length;
    const baseDelay = (characters / (wpm * 5)) * 60000;

    // Apply variance (30% for typing realism)
    const delay = this.#applyVariance(baseDelay, 0.3);

    await new Promise(resolve => setTimeout(resolve, delay));

    return delay;
  }

  /**
   * Generate burst of rapid actions with pauses
   *
   * Simulates user doing multiple quick actions then pausing.
   * Useful for modeling realistic user interaction patterns.
   *
   * @param {number} [burstCount=3] - Number of rapid actions
   * @param {number} [pauseDuration=5000] - Pause after burst in milliseconds
   * @returns {Promise<Object>} Burst timing information
   */
  async burstPattern(burstCount = 3, pauseDuration = 5000) {
    const actionDelays = [];

    // Rapid actions (500-1500ms between)
    for (let i = 0; i < burstCount - 1; i++) {
      const delay = this.rng.nextInt(500, 1500);
      await new Promise(resolve => setTimeout(resolve, delay));
      actionDelays.push(delay);
    }

    // Pause after burst
    await new Promise(resolve => setTimeout(resolve, pauseDuration));

    return {
      burstCount,
      actionDelays,
      pauseDuration,
      totalDuration: actionDelays.reduce((a, b) => a + b, 0) + pauseDuration
    };
  }

  /**
   * Generate timing sequence for multiple actions
   *
   * @param {Array<Object>} actions - Array of action objects with profile and optional callback
   * @param {Object} [options={}] - Sequence options
   * @returns {Promise<Array<Object>>} Array of timing results
   */
  async timingSequence(actions, options = {}) {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Use action-specific profile or default
      const profile = action.profile || options.defaultProfile || 'normal';
      const delay = await this.humanDelay(profile, action.options);

      const result = {
        index: i,
        action: action.name || `action_${i}`,
        profile,
        delay,
        timestamp: Date.now(),
        timeFromStart: Date.now() - startTime
      };

      results.push(result);

      // Execute callback if provided
      if (action.callback) {
        try {
          await action.callback(result);
        } catch (error) {
          console.warn(`Callback error for action ${action.name}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Add custom timing profile
   *
   * @param {string} name - Profile name
   * @param {Object} config - Profile configuration
   * @param {number} config.min - Minimum delay in ms
   * @param {number} config.max - Maximum delay in ms
   * @param {number} [config.variance=0.3] - Variance factor (0-1)
   */
  addProfile(name, config) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Profile name must be a non-empty string');
    }

    if (!config || typeof config !== 'object') {
      throw new Error('Profile config must be an object');
    }

    if (typeof config.min !== 'number' || typeof config.max !== 'number') {
      throw new Error('Profile config must have numeric min and max properties');
    }

    if (config.min >= config.max) {
      throw new Error('Profile min must be less than max');
    }

    this.profiles[name] = {
      min: config.min,
      max: config.max,
      variance: config.variance || 0.3
    };
  }

  /**
   * Get available timing profiles
   *
   * @returns {Object} Copy of available profiles
   */
  getProfiles() {
    return { ...this.profiles };
  }

  /**
   * Get timing statistics for a set of delays
   *
   * @param {Array<number>} delays - Array of delay values
   * @returns {Object} Statistical summary
   */
  calculateStats(delays) {
    if (!Array.isArray(delays) || delays.length === 0) {
      return {
        count: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        variance: 0,
        stdDev: 0
      };
    }

    const sorted = [...delays].sort((a, b) => a - b);
    const sum = delays.reduce((a, b) => a + b, 0);
    const mean = sum / delays.length;

    const variance = delays.reduce((acc, delay) => acc + Math.pow(delay - mean, 2), 0) / delays.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: delays.length,
      mean,
      median: sorted[Math.floor(delays.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      variance,
      stdDev
    };
  }

  /**
   * Get current RNG instance (for testing/debugging)
   *
   * @returns {SeededRandom} Current RNG instance
   */
  getRng() {
    return this.rng;
  }

  /**
   * Replace RNG instance
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

export default TimingEngine;
