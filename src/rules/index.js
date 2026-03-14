'use strict';

const { misleadingNameRule } = require('./misleading-name');
const { consentBypassRule } = require('./consent-bypass');
const { darkPatternRule } = require('./dark-pattern');
const { privacyViolationRule } = require('./privacy-violation');
const { deceptiveAbstractionRule } = require('./deceptive-abstraction');
const { shadowedBehaviorRule } = require('./shadowed-behavior');

/**
 * Rule Engine
 *
 * Loads, manages, and executes configurable analysis rules against
 * parsed ASTs and extracted metadata.
 */

const BUILT_IN_RULES = [
  misleadingNameRule,
  consentBypassRule,
  darkPatternRule,
  privacyViolationRule,
  deceptiveAbstractionRule,
  shadowedBehaviorRule,
];

class RuleEngine {
  constructor(config = null) {
    this.rules = [...BUILT_IN_RULES];
    this.config = config || {};

    // Apply config overrides (enable/disable rules, set severity)
    if (this.config.rules) {
      for (const rule of this.rules) {
        const ruleConfig = this.config.rules[rule.id];
        if (ruleConfig === false || ruleConfig === 'off') {
          rule.enabled = false;
        } else if (ruleConfig === true || ruleConfig === 'on') {
          rule.enabled = true;
        } else if (typeof ruleConfig === 'object') {
          Object.assign(rule, ruleConfig);
        }
      }
    }
  }

  /**
   * Run all enabled rules against the given AST and metadata
   * @param {object} ast - Babel AST
   * @param {object} metadata - Extracted metadata
   * @param {string} code - Source code
   * @param {string} filename - File path
   * @returns {Array} Issues found by rules
   */
  run(ast, metadata, code, filename) {
    const issues = [];

    for (const rule of this.rules) {
      if (rule.enabled === false) continue;

      try {
        const ruleIssues = rule.check(ast, metadata, code, filename);
        issues.push(...ruleIssues);
      } catch (err) {
        issues.push({
          rule: rule.id,
          severity: 'info',
          message: `Rule "${rule.id}" threw an error: ${err.message}`,
          line: 0,
          column: 0,
        });
      }
    }

    return issues;
  }

  /**
   * Get list of all registered rules
   */
  listRules() {
    return this.rules.map((r) => ({
      id: r.id,
      description: r.description,
      severity: r.severity,
      category: r.category,
      enabled: r.enabled !== false,
    }));
  }
}

module.exports = { RuleEngine, BUILT_IN_RULES };
