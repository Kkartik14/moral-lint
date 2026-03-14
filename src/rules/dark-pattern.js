'use strict';

/**
 * Rule: dark-pattern
 *
 * Detects common dark pattern implementations in code:
 * - Forced continuity (auto-renewal without notice)
 * - Hidden costs (fees added late in flow)
 * - Misdirection (UI elements that trick users)
 * - Roach motel (easy to subscribe, hard to cancel)
 * - Trick questions (confusing opt-in/opt-out logic)
 */

const DARK_PATTERN_CHECKS = [
  {
    id: 'forced-continuity',
    patterns: [
      /auto[_-]?renew(?:al)?\s*[:=]\s*true/i,
      /recurring\s*[:=]\s*true/i,
      /subscription[_-]?auto/i,
    ],
    antiPatterns: ['notify', 'remind', 'alert', 'email', 'warn', 'beforeRenew'],
    message: 'Auto-renewal enabled without apparent user notification mechanism',
    detail: 'Subscriptions that auto-renew without reminding users can be considered a dark pattern. Ensure users are notified before charges.',
    severity: 'warning',
  },
  {
    id: 'hidden-unsubscribe',
    patterns: [
      /unsubscribe.*(?:hidden|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)/i,
      /cancel.*(?:hidden|display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)/i,
      /opt[_-]?out.*(?:hidden|display\s*:\s*none)/i,
    ],
    antiPatterns: [],
    message: 'Unsubscribe/cancel option appears to be visually hidden',
    detail: 'Making cancellation or opt-out options hard to find is a classic roach motel dark pattern.',
    severity: 'error',
  },
  {
    id: 'confusing-negation',
    patterns: [
      /don'?t\s+not\s/i,
      /un(?:check|select).*(?:to|for)\s+(?:opt[_-]?out|disable|cancel)/i,
      /(?:check|select).*(?:to|for)\s+(?:not|no)\s/i,
    ],
    antiPatterns: [],
    message: 'Potentially confusing double-negative or trick question pattern in user-facing text',
    detail: 'Using confusing language (double negatives) for consent checkboxes is a trick question dark pattern.',
    severity: 'warning',
  },
  {
    id: 'countdown-pressure',
    patterns: [
      /countdown.*(?:offer|deal|discount|sale)/i,
      /(?:offer|deal|discount).*(?:expires?|timeout|countdown|timer)/i,
      /urgency.*(?:fake|artificial|simulated)/i,
      /setInterval.*(?:timer|countdown).*(?:price|offer|deal)/i,
    ],
    antiPatterns: [],
    message: 'Possible artificial urgency/countdown pattern detected',
    detail: 'Fake countdown timers that pressure users into quick decisions are a well-known dark pattern.',
    severity: 'warning',
  },
  {
    id: 'preselected-addons',
    patterns: [
      /(?:addon|add[_-]?on|extra|premium|insurance).*(?:checked|selected|default)\s*[:=]\s*true/i,
      /default[_-]?(?:checked|selected).*(?:addon|extra|premium|insurance)/i,
    ],
    antiPatterns: [],
    message: 'Pre-selected add-on or extra charge detected',
    detail: 'Pre-selecting paid add-ons or extras (sneak into basket) is a dark pattern. Users should explicitly opt-in.',
    severity: 'warning',
  },
  {
    id: 'share-by-default',
    patterns: [
      /(?:share|public|visible)[_-]?(?:by[_-]?default|default)\s*[:=]\s*true/i,
      /default[_-]?(?:privacy|sharing)\s*[:=]\s*['"]?(?:public|everyone|open)/i,
      /privacy[_-]?(?:setting|level|mode)\s*[:=]\s*['"]?(?:public|open|low)/i,
    ],
    antiPatterns: [],
    message: 'Default privacy setting appears to be public/shared rather than private',
    detail: 'Defaulting user data to public/shared rather than private violates the principle of privacy by default.',
    severity: 'warning',
  },
];

const darkPatternRule = {
  id: 'dark-pattern',
  description: 'Detects common dark pattern implementations in code',
  severity: 'warning',
  category: 'ethical-compliance',
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];
    const lines = code.split('\n');

    for (const check of DARK_PATTERN_CHECKS) {
      for (const pattern of check.patterns) {
        // Reset regex state
        const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
        let match;

        while ((match = regex.exec(code)) !== null) {
          const lineNum = code.slice(0, match.index).split('\n').length;

          // Check if anti-patterns (mitigations) exist nearby
          const contextStart = Math.max(0, match.index - 500);
          const contextEnd = Math.min(code.length, match.index + 500);
          const context = code.slice(contextStart, contextEnd).toLowerCase();

          const hasMitigation = check.antiPatterns.some((ap) =>
            context.includes(ap.toLowerCase())
          );

          if (!hasMitigation) {
            issues.push({
              rule: `dark-pattern/${check.id}`,
              severity: check.severity,
              message: `${check.message}: "${match[0].trim()}"`,
              detail: check.detail,
              line: lineNum,
              column: 0,
              category: 'ethical-compliance',
              remediation: getDarkPatternRemediation(check.id),
            });
          }
        }
      }
    }

    return issues;
  },
};

function getDarkPatternRemediation(checkId) {
  const remediations = {
    'forced-continuity': 'Add a notification/reminder mechanism before auto-renewal charges. Provide easy one-click cancellation.',
    'hidden-unsubscribe': 'Make cancellation and opt-out options clearly visible and easy to find.',
    'confusing-negation': 'Rewrite user-facing text to use clear, affirmative language. Avoid double negatives.',
    'countdown-pressure': 'If using timers, ensure they reflect real deadlines. Never use fake urgency.',
    'preselected-addons': 'Do not pre-select paid add-ons. Let users explicitly choose extras.',
    'share-by-default': 'Default to the most private setting. Let users explicitly choose to share.',
  };
  return remediations[checkId] || 'Review this pattern for potential dark pattern concerns.';
}

module.exports = { darkPatternRule };
