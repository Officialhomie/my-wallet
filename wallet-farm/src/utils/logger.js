import chalk from 'chalk';

/**
 * Simple logging utility with colored output
 */
export class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  error(message, ...args) {
    if (this.levels[this.level] >= this.levels.error) {
      console.error(chalk.red('❌ ' + message), ...args);
    }
  }

  warn(message, ...args) {
    if (this.levels[this.level] >= this.levels.warn) {
      console.warn(chalk.yellow('⚠️  ' + message), ...args);
    }
  }

  info(message, ...args) {
    if (this.levels[this.level] >= this.levels.info) {
      console.info(chalk.blue('ℹ️  ' + message), ...args);
    }
  }

  success(message, ...args) {
    if (this.levels[this.level] >= this.levels.info) {
      console.log(chalk.green('✅ ' + message), ...args);
    }
  }

  debug(message, ...args) {
    if (this.levels[this.level] >= this.levels.debug) {
      console.debug(chalk.gray('🔍 ' + message), ...args);
    }
  }
}

// Default logger instance
export const logger = new Logger(process.env.LOG_LEVEL || 'info');

export default logger;
