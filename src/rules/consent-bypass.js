'use strict';

const traverse = require('@babel/traverse').default;

/**
 * Rule: consent-bypass
 *
 * Detects patterns where sensitive actions are performed without
 * corresponding user consent checks — e.g., accessing location,
 * camera, or making payments without confirmation dialogs.
 */

const SENSITIVE_ACTIONS = [
  { pattern: 'navigator.geolocation', label: 'geolocation access' },
  { pattern: 'navigator.mediaDevices', label: 'camera/microphone access' },
  { pattern: 'navigator.bluetooth', label: 'Bluetooth access' },
  { pattern: 'navigator.usb', label: 'USB device access' },
  { pattern: 'Notification.requestPermission', label: 'notification permission' },
  { pattern: 'PaymentRequest', label: 'payment processing' },
  { pattern: 'navigator.credentials', label: 'credential access' },
  { pattern: 'navigator.clipboard', label: 'clipboard access' },
  { pattern: 'document.cookie', label: 'cookie manipulation' },
  { pattern: 'localStorage', label: 'local storage of user data' },
  { pattern: 'navigator.sendBeacon', label: 'data beacon transmission' },
];

const CONSENT_PATTERNS = [
  'confirm', 'prompt', 'alert', 'showDialog', 'showModal',
  'openDialog', 'askPermission', 'requestPermission',
  'getConsent', 'showConsent', 'consentDialog',
  'userConfirm', 'showConfirmation', 'askUser',
  'window.confirm', 'window.prompt',
];

const consentBypassRule = {
  id: 'consent-bypass',
  description: 'Detects sensitive operations performed without user consent verification',
  severity: 'error',
  category: 'ethical-compliance',
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];

    for (const fn of metadata.functions) {
      if (fn.name === '<anonymous>' || fn.name === 'constructor') continue;

      const calleesStr = fn.callees.join(' ').toLowerCase();
      const bodyLower = (fn.body || '').toLowerCase();

      for (const action of SENSITIVE_ACTIONS) {
        const actionLower = action.pattern.toLowerCase();

        // Check if this function uses a sensitive API
        if (bodyLower.includes(actionLower)) {
          // Check if there's any consent mechanism nearby
          const hasConsent = CONSENT_PATTERNS.some(
            (cp) => calleesStr.includes(cp.toLowerCase()) || bodyLower.includes(cp.toLowerCase())
          );

          if (!hasConsent) {
            issues.push({
              rule: 'consent-bypass',
              severity: 'error',
              message: `Function "${fn.name}" performs ${action.label} without apparent user consent check.`,
              detail: `The function accesses "${action.pattern}" but does not appear to include any user confirmation dialog or consent verification before the sensitive operation.`,
              line: fn.loc ? fn.loc.start.line : 0,
              column: fn.loc ? fn.loc.start.column : 0,
              category: 'ethical-compliance',
              function: fn.name,
              remediation: `Add a user consent/confirmation step before accessing ${action.pattern}. Example: if (await askPermission("${action.label}")) { ... }`,
            });
          }
        }
      }
    }

    // Also check for auto-accepting terms patterns
    checkAutoAcceptPatterns(ast, code, issues);

    return issues;
  },
};

/**
 * Detect patterns that automatically accept terms/agreements on behalf of the user
 */
function checkAutoAcceptPatterns(ast, code, issues) {
  const autoAcceptPatterns = [
    /\.checked\s*=\s*true/g,
    /setChecked\s*\(\s*true\s*\)/g,
    /accept[A-Za-z]*\s*=\s*true/g,
    /agreed?\s*=\s*true/g,
    /consent\s*=\s*true/g,
    /opt[_-]?in\s*=\s*true/g,
  ];

  const lines = code.split('\n');

  for (const pattern of autoAcceptPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      const lineText = lines[lineNum - 1] || '';

      // Check surrounding context for user interaction
      const surroundingStart = Math.max(0, match.index - 200);
      const surroundingEnd = Math.min(code.length, match.index + 200);
      const context = code.slice(surroundingStart, surroundingEnd).toLowerCase();

      const hasUserAction = context.includes('onclick') ||
        context.includes('onchange') ||
        context.includes('onsubmit') ||
        context.includes('addeventlistener') ||
        context.includes('userinput') ||
        context.includes('handleclick');

      if (!hasUserAction) {
        issues.push({
          rule: 'consent-bypass',
          severity: 'warning',
          message: `Potential auto-consent pattern detected: "${match[0]}"`,
          detail: 'This code appears to programmatically set a consent/agreement flag without user interaction. Users should explicitly opt-in to terms and agreements.',
          line: lineNum,
          column: 0,
          category: 'ethical-compliance',
          remediation: 'Ensure consent flags are only set in response to explicit user actions (click, form submit, etc.).',
        });
      }
    }
  }
}

module.exports = { consentBypassRule };
