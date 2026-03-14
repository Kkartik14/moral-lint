'use strict';

/**
 * JSON Reporter
 *
 * Outputs analysis results as structured JSON for CI pipelines,
 * dashboards, and programmatic consumption.
 */

class JSONReporter {
  /**
   * Render results as JSON string
   * @param {object} results - Analysis results
   * @param {string} outputPath - Optional file path to write JSON
   */
  render(results, outputPath) {
    const json = JSON.stringify(results, null, 2);

    if (outputPath) {
      const fs = require('fs');
      fs.writeFileSync(outputPath, json, 'utf-8');
      console.log(`Report written to: ${outputPath}`);
    } else {
      console.log(json);
    }
  }
}

module.exports = { JSONReporter };
