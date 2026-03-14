'use strict';

const { CLIReporter } = require('./cli-reporter');
const { JSONReporter } = require('./json-reporter');

/**
 * Create a reporter based on format type
 * @param {string} format - 'cli' or 'json'
 * @returns {object} Reporter instance
 */
function createReporter(format = 'cli') {
  switch (format) {
    case 'json':
      return new JSONReporter();
    case 'cli':
    default:
      return new CLIReporter();
  }
}

module.exports = { createReporter, CLIReporter, JSONReporter };
