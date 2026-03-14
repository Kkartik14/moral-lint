/**
 * Moral-Lint Configuration
 *
 * Customize rules, severity levels, and analysis options.
 */
module.exports = {
  // Minimum severity to report: 'info', 'warning', 'error'
  severity: 'info',

  // File patterns to ignore (in addition to defaults)
  ignore: [
    '**/test/**',
    '**/__tests__/**',
    '**/*.test.js',
    '**/*.spec.js',
  ],

  // Rule configuration
  // Set to false/'off' to disable, true/'on' to enable,
  // or an object to configure specific options
  rules: {
    'misleading-name': true,
    'consent-bypass': true,
    'dark-pattern': true,
    'privacy-violation': true,
    'deceptive-abstraction': true,
    'shadowed-behavior': true,
  },

  // AI analysis settings
  ai: {
    enabled: true,
    model: 'openrouter/hunter-alpha',
    maxFileSize: 5000, // Max characters to send to AI
  },
};
