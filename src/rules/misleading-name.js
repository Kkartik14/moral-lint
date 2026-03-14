'use strict';

/**
 * Rule: misleading-name
 *
 * Detects functions whose names suggest one behavior but whose
 * implementations suggest another (or nothing at all).
 */

const CONTRADICTORY_PAIRS = [
  { nameHint: 'get', antiPattern: 'hasNetworkCall', when: 'set', msg: 'Name says "get" but makes network calls that could be setting data' },
  { nameHint: 'read', antiPattern: 'hasFileAccess', when: 'write', msg: 'Name says "read" but performs file write operations' },
  { nameHint: 'check', antiPattern: 'hasNetworkCall', when: 'send', msg: 'Name says "check/validate" but sends data over the network' },
  { nameHint: 'display', antiPattern: 'hasNetworkCall', when: 'fetch', msg: 'Name says "display/show" but makes network calls' },
  { nameHint: 'log', antiPattern: 'hasNetworkCall', when: 'send', msg: 'Name says "log" but sends data to external services' },
  { nameHint: 'format', antiPattern: 'hasNetworkCall', when: 'network', msg: 'Name says "format/transform" but makes network calls' },
  { nameHint: 'util', antiPattern: 'hasSensitiveAPI', when: 'sensitive', msg: 'Utility function name hides access to sensitive APIs' },
  { nameHint: 'helper', antiPattern: 'hasSensitiveAPI', when: 'sensitive', msg: 'Helper function name hides access to sensitive APIs' },
];

const misleadingNameRule = {
  id: 'misleading-name',
  description: 'Detects functions with names that contradict their actual behavior',
  severity: 'warning',
  category: 'semantic-consistency',
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];

    for (const fn of metadata.functions) {
      if (fn.name === '<anonymous>' || fn.name === 'constructor') continue;
      const nameLower = fn.name.toLowerCase();

      for (const pair of CONTRADICTORY_PAIRS) {
        if (nameLower.includes(pair.nameHint)) {
          // Check the anti-pattern conditions
          const hasAnti = fn[pair.antiPattern];
          if (hasAnti) {
            // Verify the contradictory behavior through callees
            const calleesLower = fn.callees.map((c) => c.toLowerCase()).join(' ');
            if (calleesLower.includes(pair.when) || hasAnti) {
              issues.push({
                rule: 'misleading-name',
                severity: 'warning',
                message: `${pair.msg}: "${fn.name}"`,
                detail: `The function name "${fn.name}" contains "${pair.nameHint}" which implies a certain behavior, but the implementation does something contradictory.`,
                line: fn.loc ? fn.loc.start.line : 0,
                column: fn.loc ? fn.loc.start.column : 0,
                category: 'semantic-consistency',
                function: fn.name,
                remediation: `Rename the function to accurately reflect its behavior, or separate the ${pair.nameHint} and ${pair.when} concerns into distinct functions.`,
              });
            }
          }
        }
      }
    }

    return issues;
  },
};

module.exports = { misleadingNameRule };
