'use strict';

/**
 * Rule: deceptive-abstraction
 *
 * Detects functions or modules that hide their true behavior
 * behind innocuous-sounding names or interfaces.
 */

const INNOCENT_NAMES = [
  'init', 'setup', 'configure', 'bootstrap', 'start',
  'helper', 'util', 'utils', 'common', 'shared',
  'process', 'handle', 'manage', 'run', 'execute',
  'update', 'refresh', 'sync', 'optimize', 'improve',
  'enhance', 'enrich', 'transform', 'prepare', 'build',
  'newsletter', 'subscribe', 'notify', 'alert',
];

const SUSPICIOUS_BEHAVIORS = [
  {
    check: (fn) => fn.hasNetworkCall && fn.hasSensitiveAPI,
    label: 'network + sensitive API',
    description: 'combines network calls with sensitive API access',
  },
  {
    check: (fn) => fn.callees.some((c) => c.toLowerCase().includes('track') || c.toLowerCase().includes('analytics')),
    label: 'hidden tracking',
    description: 'performs tracking/analytics',
  },
  {
    check: (fn) => fn.callees.some((c) => c.toLowerCase().includes('cookie') || c.includes('localStorage')),
    label: 'hidden data storage',
    description: 'stores data in cookies or localStorage',
  },
  {
    check: (fn) =>
      fn.callees.some(
        (c) =>
          c.toLowerCase().includes('harvest') ||
          c.toLowerCase().includes('scrape') ||
          c.toLowerCase().includes('collect') ||
          c.toLowerCase().includes('exfiltrate')
      ),
    label: 'data collection',
    description: 'collects or harvests data',
  },
  {
    check: (fn) => fn.callees.some((c) => c.toLowerCase().includes('redirect') || c.includes('window.location')),
    label: 'hidden redirect',
    description: 'redirects the user',
  },
];

const deceptiveAbstractionRule = {
  id: 'deceptive-abstraction',
  description: 'Detects innocuously-named functions that hide concerning behavior',
  severity: 'warning',
  category: 'ethical-compliance',
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];

    for (const fn of metadata.functions) {
      if (fn.name === '<anonymous>' || fn.name === 'constructor') continue;

      const nameLower = fn.name.toLowerCase();
      const hasInnocentName = INNOCENT_NAMES.some((n) => nameLower.includes(n));

      if (!hasInnocentName) continue;

      for (const behavior of SUSPICIOUS_BEHAVIORS) {
        if (behavior.check(fn)) {
          issues.push({
            rule: `deceptive-abstraction/${behavior.label}`,
            severity: 'warning',
            message: `Function "${fn.name}" has a generic/innocuous name but ${behavior.description}.`,
            detail: `The function name "${fn.name}" suggests routine functionality, but the implementation contains ${behavior.label} behavior that may not be expected by the caller. This could hide the true impact of calling this function.`,
            line: fn.loc ? fn.loc.start.line : 0,
            column: fn.loc ? fn.loc.start.column : 0,
            category: 'ethical-compliance',
            function: fn.name,
            remediation: `Rename the function to clearly indicate its ${behavior.label} behavior, or separate the concerns into distinct functions with transparent names.`,
          });
        }
      }
    }

    return issues;
  },
};

module.exports = { deceptiveAbstractionRule };
