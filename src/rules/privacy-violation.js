'use strict';

/**
 * Rule: privacy-violation
 *
 * Detects patterns that may violate user privacy:
 * - Excessive data collection
 * - Tracking without consent
 * - Logging sensitive data
 * - Fingerprinting
 * - Hidden data exfiltration
 */

const TRACKING_PATTERNS = [
  {
    pattern: /(?:track|analytics|telemetry|beacon|pixel).*(?:send|post|fire|emit|log)/i,
    label: 'tracking/analytics',
    message: 'Tracking or analytics data being sent',
  },
  {
    pattern: /navigator\.sendBeacon/i,
    label: 'sendBeacon',
    message: 'Data transmission via sendBeacon (often used for tracking)',
  },
  {
    pattern: /fingerprint/i,
    label: 'fingerprinting',
    message: 'Possible browser/device fingerprinting detected',
  },
  {
    pattern: /(?:canvas|webgl).*(?:fingerprint|toDataURL|getImageData)/i,
    label: 'canvas fingerprint',
    message: 'Canvas-based fingerprinting pattern detected',
  },
];

const SENSITIVE_DATA_PATTERNS = [
  {
    pattern: /(?:console\.log|log\(|print|debug).*(?:password|passwd|secret|token|api[_-]?key|private[_-]?key)/i,
    label: 'credential logging',
    message: 'Sensitive credential data appears to be logged',
    severity: 'error',
  },
  {
    pattern: /(?:password|passwd|secret|token|api[_-]?key|private[_-]?key).*(?:console\.log|log\(|print|debug)/i,
    label: 'credential logging',
    message: 'Sensitive credential data appears to be logged',
    severity: 'error',
  },
  {
    pattern: /(?:ssn|social[_-]?security|credit[_-]?card|card[_-]?number|cvv|cvc).*(?:log|console|store|save|send)/i,
    label: 'PII logging',
    message: 'Personally identifiable information (PII) may be logged or transmitted',
    severity: 'error',
  },
  {
    pattern: /(?:email|phone|address|birth[_-]?date|dob).*(?:track|analytics|beacon|telemetry)/i,
    label: 'PII tracking',
    message: 'Personal data appears to be included in tracking/analytics',
    severity: 'warning',
  },
  {
    pattern: /(?:console\.log|log\().*(?:user[_-]?data|personal|private|sensitive)/i,
    label: 'sensitive data logging',
    message: 'Potentially sensitive user data being logged to console',
    severity: 'warning',
  },
];

const EXCESSIVE_COLLECTION_PATTERNS = [
  {
    pattern: /navigator\.(?:userAgent|platform|language|languages|hardwareConcurrency|deviceMemory|connection)/i,
    label: 'device info collection',
    message: 'Device/browser information being collected',
  },
  {
    pattern: /screen\.(?:width|height|availWidth|availHeight|colorDepth|pixelDepth)/i,
    label: 'screen info collection',
    message: 'Screen information being collected',
  },
  {
    pattern: /(?:getInstalledRelatedApps|getBattery|getGamepads)/i,
    label: 'extended device APIs',
    message: 'Extended device information APIs accessed',
  },
];

const privacyViolationRule = {
  id: 'privacy-violation',
  description: 'Detects patterns that may violate user privacy through tracking, data collection, or sensitive data exposure',
  severity: 'warning',
  category: 'ethical-compliance',
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];
    const lines = code.split('\n');

    // Check tracking patterns
    for (const tp of TRACKING_PATTERNS) {
      const regex = new RegExp(tp.pattern.source, 'gi');
      let match;
      while ((match = regex.exec(code)) !== null) {
        const lineNum = code.slice(0, match.index).split('\n').length;

        // Check for consent guard
        const contextStart = Math.max(0, match.index - 300);
        const context = code.slice(contextStart, match.index).toLowerCase();
        const hasConsentCheck = context.includes('consent') ||
          context.includes('optedIn') ||
          context.includes('opted_in') ||
          context.includes('doNotTrack') ||
          context.includes('do_not_track') ||
          context.includes('gdpr') ||
          context.includes('ccpa');

        issues.push({
          rule: `privacy-violation/${tp.label}`,
          severity: hasConsentCheck ? 'info' : 'warning',
          message: `${tp.message}: "${match[0].trim()}"`,
          detail: hasConsentCheck
            ? 'Tracking detected but a consent check appears to be present.'
            : 'This tracking code does not appear to have a consent check. Under GDPR/CCPA, user consent may be required.',
          line: lineNum,
          column: 0,
          category: 'ethical-compliance',
          remediation: 'Ensure tracking only activates after explicit user consent. Respect Do-Not-Track signals.',
        });
      }
    }

    // Check sensitive data patterns
    for (const sdp of SENSITIVE_DATA_PATTERNS) {
      const regex = new RegExp(sdp.pattern.source, 'gi');
      let match;
      while ((match = regex.exec(code)) !== null) {
        const lineNum = code.slice(0, match.index).split('\n').length;
        issues.push({
          rule: `privacy-violation/${sdp.label}`,
          severity: sdp.severity,
          message: `${sdp.message}: "${match[0].trim().slice(0, 60)}"`,
          detail: 'Logging or transmitting sensitive data can expose users to privacy breaches. This data should be redacted or excluded.',
          line: lineNum,
          column: 0,
          category: 'ethical-compliance',
          remediation: 'Remove sensitive data from logs and analytics. Use redaction or masking for any necessary logging.',
        });
      }
    }

    // Check excessive collection (only flag if multiple types are collected)
    const collectionsFound = [];
    for (const ecp of EXCESSIVE_COLLECTION_PATTERNS) {
      const regex = new RegExp(ecp.pattern.source, 'gi');
      if (regex.test(code)) {
        collectionsFound.push(ecp);
      }
    }

    if (collectionsFound.length >= 2) {
      issues.push({
        rule: 'privacy-violation/excessive-collection',
        severity: 'warning',
        message: `Excessive device/browser data collection detected (${collectionsFound.length} categories: ${collectionsFound.map((c) => c.label).join(', ')})`,
        detail: 'Collecting multiple categories of device information may constitute fingerprinting. Only collect data that is strictly necessary for functionality.',
        line: 1,
        column: 0,
        category: 'ethical-compliance',
        remediation: 'Apply data minimization principles. Only collect device information that is strictly necessary. Disclose collection in privacy policy.',
      });
    }

    return issues;
  },
};

module.exports = { privacyViolationRule };
