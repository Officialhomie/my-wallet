/**
 * TimingEngine - Generates human-like delays and timing patterns
 *
 * Creates realistic timing distributions that mimic human behavior
 * rather than predictable automated patterns.
 */
export class TimingEngine {
  constructor(options = {}) {
    this.options = {
      baseMultiplier: options.baseMultiplier || 1.0,
      variance: options.variance || 0.3, // 30% variance by default
      ...options
    };

    // Predefined timing profiles for different activity types
    this.timingProfiles = {
      quick: { min: 1000, max: 3000 },      // Reading data, quick checks
      normal: { min: 2000, max: 8000 },     // Standard interactions
      thoughtful: { min: 10000, max: 30000 }, // Reviewing before confirming
      slow: { min: 30000, max: 120000 },   // Careful consideration
      verySlow: { min: 300000, max: 600000 }, // Rare interactions
      instant: { min: 100, max: 500 },      // Immediate responses
      deliberate: { min: 60000, max: 180000 } // Very careful actions
    };
  }

  /**
   * Generates a human-like delay with weighted distribution
   *
   * @param {string|Object} profile - Timing profile name or custom profile object
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<number>} Delay duration in milliseconds
   */
  async humanDelay(profile = 'normal', options = {}) {
    const opts = { ...this.options, ...options };
    const config = typeof profile === 'string' ?
      this.timingProfiles[profile] || this.timingProfiles.normal :
      profile;

    if (!config || !config.min || !config.max) {
      throw new Error(`Invalid timing profile: ${profile}`);
    }

    // Apply multipliers
    let minMs = config.min * opts.baseMultiplier;
    let maxMs = config.max * opts.baseMultiplier;

    // Apply custom multipliers if provided
    if (opts.minMultiplier) minMs *= opts.minMultiplier;
    if (opts.maxMultiplier) maxMs *= opts.maxMultiplier;

    // Generate delay with weighted distribution (humans tend toward middle)
    const range = maxMs - minMs;
    const random = Math.random();

    // Use beta distribution approximation for more realistic timing
    // This creates a distribution that's weighted toward the middle
    const weighted = this.#betaDistribution(random, 2, 2); // Beta(2,2) peaks in middle
    const delay = Math.floor(weighted * range) + minMs;

    // Apply variance
    const variance = delay * opts.variance * (Math.random() - 0.5) * 2;
    const finalDelay = Math.max(100, delay + variance); // Minimum 100ms

    if (opts.verbose) {
      console.log(`⏱️  Human delay: ${Math.round(finalDelay)}ms (${profile} profile)`);
    }

    await new Promise(resolve => setTimeout(resolve, finalDelay));
    return finalDelay;
  }

  /**
   * Generates a simple random delay between min and max
   *
   * @param {number} minMs - Minimum delay in milliseconds
   * @param {number} maxMs - Maximum delay in milliseconds
   * @returns {Promise<number>} Delay duration in milliseconds
   */
  async randomDelay(minMs, maxMs) {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }

  /**
   * Simulates human typing speed
   *
   * @param {string} text - Text being typed
   * @param {number} [wpm=40] - Words per minute typing speed
   * @returns {Promise<number>} Typing duration in milliseconds
   */
  async simulateTyping(text, wpm = 40) {
    const words = text.split(/\s+/).length;
    const baseTypingTime = (words / wpm) * 60000; // Convert to milliseconds

    // Add realistic variance (±30%)
    const variance = baseTypingTime * 0.3;
    const actualTypingTime = baseTypingTime + (Math.random() - 0.5) * variance;

    // Add occasional pauses (thinking breaks)
    const pauseChance = 0.2; // 20% chance of pause
    const pauseTime = pauseChance > Math.random() ?
      Math.random() * 2000 + 500 : 0; // 500-2500ms pause

    const totalTime = Math.max(500, actualTypingTime + pauseTime);

    await new Promise(resolve => setTimeout(resolve, totalTime));
    return totalTime;
  }

  /**
   * Creates a timing sequence for multi-step processes
   *
   * @param {Array<string|Object>} steps - Array of timing profiles for each step
   * @param {Object} [options={}] - Options for the sequence
   * @returns {Promise<Array<number>>} Array of delay durations
   */
  async timingSequence(steps, options = {}) {
    const delays = [];
    const opts = { ...this.options, ...options };

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Add inter-step delay if not the first step
      if (i > 0 && opts.interStepDelay) {
        const interDelay = await this.humanDelay(opts.interStepDelay, { verbose: false });
        delays.push(interDelay);
      }

      const delay = await this.humanDelay(step, opts);
      delays.push(delay);
    }

    return delays;
  }

  /**
   * Generates burst patterns (rapid actions followed by pauses)
   *
   * @param {number} burstSize - Number of quick actions
   * @param {string} burstProfile - Profile for burst actions
   * @param {string} pauseProfile - Profile for pauses between bursts
   * @param {number} [iterations=1] - Number of burst-pause cycles
   * @returns {Promise<Array<number>>} Array of delay durations
   */
  async burstPattern(burstSize, burstProfile = 'quick', pauseProfile = 'normal', iterations = 1) {
    const delays = [];

    for (let i = 0; i < iterations; i++) {
      // Burst of quick actions
      for (let j = 0; j < burstSize; j++) {
        const delay = await this.humanDelay(burstProfile, { verbose: false });
        delays.push(delay);
      }

      // Pause before next burst (except for last iteration)
      if (i < iterations - 1) {
        const pauseDelay = await this.humanDelay(pauseProfile, { verbose: false });
        delays.push(pauseDelay);
      }
    }

    return delays;
  }

  /**
   * Creates a custom timing profile
   *
   * @param {string} name - Profile name
   * @param {Object} config - Profile configuration
   * @param {number} config.min - Minimum delay in ms
   * @param {number} config.max - Maximum delay in ms
   */
  addProfile(name, config) {
    if (!name || typeof name !== 'string') {
      throw new Error('Profile name must be a non-empty string');
    }

    if (!config || typeof config !== 'object') {
      throw new Error('Profile config must be an object');
    }

    if (!config.min || !config.max || config.min >= config.max) {
      throw new Error('Profile must have valid min and max values');
    }

    this.timingProfiles[name] = { ...config };
  }

  /**
   * Gets all available timing profiles
   *
   * @returns {Object} Copy of timing profiles
   */
  getProfiles() {
    return { ...this.timingProfiles };
  }

  /**
   * Beta distribution approximation for more realistic timing
   * @private
   * @param {number} x - Random value between 0 and 1
   * @param {number} alpha - Alpha parameter
   * @param {number} beta - Beta parameter
   * @returns {number} Beta distributed value
   */
  #betaDistribution(x, alpha, beta) {
    // Simplified beta distribution using approximation
    // For more accuracy, could implement full beta distribution
    if (alpha === 2 && beta === 2) {
      // Beta(2,2) is equivalent to arcsine distribution
      return 0.5 + 0.5 * Math.sin(Math.PI * (x - 0.5));
    }

    // Fallback to weighted distribution
    return Math.pow(x, 1 / alpha) * Math.pow(1 - x, 1 / beta);
  }

  /**
   * Calculates timing statistics
   *
   * @param {Array<number>} delays - Array of delay measurements
   * @returns {Object} Timing statistics
   */
  calculateStats(delays) {
    if (!Array.isArray(delays) || delays.length === 0) {
      return { count: 0 };
    }

    const sorted = [...delays].sort((a, b) => a - b);
    const sum = delays.reduce((a, b) => a + b, 0);

    return {
      count: delays.length,
      total: sum,
      average: sum / delays.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      standardDeviation: this.#calculateStandardDeviation(delays, sum / delays.length)
    };
  }

  /**
   * Calculates standard deviation
   * @private
   * @param {Array<number>} values - Array of values
   * @param {number} mean - Mean value
   * @returns {number} Standard deviation
   */
  #calculateStandardDeviation(values, mean) {
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

export default TimingEngine;
