/**
 * SeededRandom - Deterministic pseudo-random number generator
 *
 * Uses xorshift128 algorithm for deterministic, reproducible sequences
 * Critical for reproducible simulation testing
 */
export class SeededRandom {
  /**
   * Initialize with xorshift128 state
   *
   * @param {number} [seed=Date.now()] - Seed for deterministic sequences
   */
  constructor(seed = Date.now()) {
    // Store original seed for reset/fork operations
    this._originalSeed = seed;

    // Initialize xorshift128 state with seed
    this.state = new Uint32Array(4);
    this.state[0] = seed >>> 0;        // Ensure unsigned 32-bit
    this.state[1] = (seed ^ 0x9E3779B9) >>> 0; // Golden ratio constant
    this.state[2] = (seed ^ 0xB5297A4D) >>> 0; // Another mixing constant
    this.state[3] = (seed ^ 0x68E31DA4) >>> 0; // Another mixing constant
  }

  /**
   * Generate next pseudo-random number using xorshift128
   *
   * @returns {number} Float in range [0, 1)
   */
  next() {
    // xorshift128 algorithm: (x ^= x << a, x ^= x >> b, x ^= x << c) >>> 0
    // Using parameters: a=11, b=8, c=19 (optimized for period and randomness)

    let t = this.state[3];

    // First shift operations
    this.state[3] = this.state[2];
    this.state[2] = this.state[1];
    this.state[1] = this.state[0];

    // XOR and shift operations
    t ^= t << 11;
    t ^= t >>> 8;
    this.state[0] = (t ^ this.state[0] ^ (this.state[0] >>> 19)) >>> 0;

    // Return normalized float [0, 1)
    return (this.state[0] >>> 0) / 0xFFFFFFFF;
  }

  /**
   * Generate random integer in range [min, max] inclusive
   *
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random integer in range
   */
  nextInt(min, max) {
    if (min > max) {
      throw new Error('min must be <= max');
    }

    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('min and max must be integers');
    }

    const range = max - min + 1;
    const randomValue = Math.floor(this.next() * range);

    return min + randomValue;
  }

  /**
   * Generate random float in range [min, max)
   *
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (exclusive)
   * @returns {number} Random float in range
   */
  nextFloat(min = 0, max = 1) {
    if (min >= max) {
      throw new Error('min must be < max');
    }

    return min + (this.next() * (max - min));
  }

  /**
   * Generate random boolean with specified probability
   *
   * @param {number} [probability=0.5] - Probability of returning true (0-1)
   * @returns {boolean} Random boolean
   */
  nextBoolean(probability = 0.5) {
    if (probability < 0 || probability > 1) {
      throw new Error('probability must be between 0 and 1');
    }

    return this.next() < probability;
  }

  /**
   * Select random element from array
   *
   * @param {Array} array - Array to select from
   * @returns {*} Random element from array
   */
  choose(array) {
    if (!Array.isArray(array)) {
      throw new Error('array must be an array');
    }
    if (array.length === 0) {
      throw new Error('array must be non-empty array');
    }

    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   *
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array (same reference)
   */
  shuffle(array) {
    if (!Array.isArray(array)) {
      throw new Error('array must be an array');
    }

    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
  }

  /**
   * Create a new SeededRandom instance with different seed
   *
   * @param {number} [offset=1] - Seed offset from current seed
   * @returns {SeededRandom} New instance with different seed
   */
  fork(offset = 1) {
    // Create new seed by adding offset to original seed
    // This gives us a related but different sequence
    return new SeededRandom(this._originalSeed + offset);
  }

  /**
   * Get current internal state (for debugging)
   *
   * @returns {Uint32Array} Copy of internal state
   */
  getState() {
    return new Uint32Array(this.state);
  }

  /**
   * Reset generator to initial state with same seed
   *
   * @param {number} [newSeed] - Optional new seed
   */
  reset(newSeed) {
    const seedToUse = newSeed !== undefined ? newSeed : this._originalSeed;

    // Update original seed if new seed provided
    if (newSeed !== undefined) {
      this._originalSeed = newSeed;
    }

    // Reinitialize state with seed
    this.state[0] = seedToUse >>> 0;
    this.state[1] = (seedToUse ^ 0x9E3779B9) >>> 0;
    this.state[2] = (seedToUse ^ 0xB5297A4D) >>> 0;
    this.state[3] = (seedToUse ^ 0x68E31DA4) >>> 0;
  }
}

export default SeededRandom;
