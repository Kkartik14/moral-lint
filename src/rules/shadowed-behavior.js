'use strict';

/**
 * Rule: shadowed-behavior
 *
 * Detects functions that perform hidden side effects beyond their
 * apparent purpose — e.g., a "formatDate" function that also logs
 * analytics data, or a "renderUI" that silently sends telemetry.
 */

const SIDE_EFFECT_CATEGORIES = [
  {
    label: 'network',
    detect: (fn) => fn.hasNetworkCall,
    innocentNames: ['format', 'parse', 'validate', 'calculate', 'compute', 'convert', 'transform', 'render', 'display', 'toString', 'compare', 'sort', 'filter', 'map', 'reduce', 'merge', 'clone', 'copy'],
  },
  {
    label: 'file-system',
    detect: (fn) => fn.hasFileAccess,
    innocentNames: ['format', 'parse', 'validate', 'calculate', 'compute', 'convert', 'transform', 'render', 'display', 'toString', 'compare', 'sort', 'filter', 'map'],
  },
  {
    label: 'sensitive-API',
    detect: (fn) => fn.hasSensitiveAPI,
    innocentNames: ['format', 'parse', 'validate', 'calculate', 'compute', 'convert', 'transform', 'render', 'display', 'toString', 'compare', 'sort', 'filter', 'map', 'init', 'setup'],
  },
];

const shadowedBehaviorRule = {
  id: 'shadowed-behavior',
  description: 'Detects hidden side effects in functions whose names suggest pure or simple operations',
  severity: 'warning',
  category: 'semantic-consistency',
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];

    for (const fn of metadata.functions) {
      if (fn.name === '<anonymous>' || fn.name === 'constructor') continue;

      const nameLower = fn.name.toLowerCase();

      for (const category of SIDE_EFFECT_CATEGORIES) {
        if (!category.detect(fn)) continue;

        const suggestsInnocent = category.innocentNames.some((n) =>
          nameLower.startsWith(n) || nameLower.includes(n)
        );

        if (suggestsInnocent) {
          issues.push({
            rule: `shadowed-behavior/${category.label}`,
            severity: 'warning',
            message: `Function "${fn.name}" appears to have hidden ${category.label} side effects.`,
            detail: `The function name suggests a pure/simple operation, but it contains ${category.label} access. Callers may not expect these side effects.`,
            line: fn.loc ? fn.loc.start.line : 0,
            column: fn.loc ? fn.loc.start.column : 0,
            category: 'semantic-consistency',
            function: fn.name,
            remediation: `Either rename the function to indicate the ${category.label} side effect, or extract the side effect into a separate, clearly-named function.`,
          });
        }
      }
    }

    return issues;
  },
};

module.exports = { shadowedBehaviorRule };
