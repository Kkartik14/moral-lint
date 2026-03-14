'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('../src/parser');
const { extractMetadata } = require('../src/analyzer/metadata');
const { RuleEngine } = require('../src/rules');

describe('Rule Engine', () => {
  const engine = new RuleEngine();

  function runRules(code, filename = 'test.js') {
    const ast = parse(code, filename);
    const metadata = extractMetadata(ast, code, filename);
    return engine.run(ast, metadata, code, filename);
  }

  describe('misleading-name rule', () => {
    test('flags log function that makes network calls', () => {
      const issues = runRules(`
        function logEvent(event) {
          fetch('/api/track', { method: 'POST', body: JSON.stringify(event) });
        }
      `);

      expect(issues.some((i) => i.rule === 'misleading-name')).toBe(true);
    });
  });

  describe('consent-bypass rule', () => {
    test('flags geolocation without consent', () => {
      const issues = runRules(`
        function getPosition() {
          navigator.geolocation.getCurrentPosition(callback);
        }
      `);

      expect(issues.some((i) => i.rule === 'consent-bypass')).toBe(true);
    });

    test('does NOT flag geolocation with confirm dialog', () => {
      const issues = runRules(`
        function getPosition() {
          if (window.confirm('Allow location access?')) {
            navigator.geolocation.getCurrentPosition(callback);
          }
        }
      `);

      const consentIssues = issues.filter(
        (i) => i.rule === 'consent-bypass' && i.severity === 'error'
      );
      expect(consentIssues.length).toBe(0);
    });

    test('flags auto-accept patterns', () => {
      const issues = runRules(`
        function setup() {
          const terms = {};
          terms.accepted = true;
          terms.consent = true;
        }
      `);

      expect(issues.some((i) => i.rule === 'consent-bypass')).toBe(true);
    });
  });

  describe('dark-pattern rule', () => {
    test('flags auto-renewal without notification', () => {
      const issues = runRules(`
        function subscribe(plan) {
          return { plan, autoRenewal: true };
        }
      `);

      expect(issues.some((i) => i.rule.startsWith('dark-pattern'))).toBe(true);
    });

    test('flags hidden unsubscribe', () => {
      const issues = runRules(`
        function render() {
          return '<a href="/unsubscribe" style="display: none">Unsubscribe</a>';
        }
      `);

      expect(issues.some((i) => i.rule.includes('hidden-unsubscribe'))).toBe(true);
    });

    test('flags pre-selected add-ons', () => {
      const issues = runRules(`
        function checkout() {
          const insuranceAddon = { checked: true, price: 9.99 };
          return insuranceAddon;
        }
      `);

      expect(issues.some((i) => i.rule.includes('preselected-addon'))).toBe(true);
    });

    test('flags share-by-default', () => {
      const issues = runRules(`
        function createProfile(name) {
          return { name, shareByDefault: true };
        }
      `);

      expect(issues.some((i) => i.rule.includes('share-by-default'))).toBe(true);
    });
  });

  describe('privacy-violation rule', () => {
    test('flags credential logging', () => {
      const issues = runRules(`
        function login(user, password) {
          console.log('password:', password);
        }
      `);

      expect(issues.some((i) => i.rule.includes('privacy-violation'))).toBe(true);
    });

    test('flags tracking without consent', () => {
      const issues = runRules(`
        function init() {
          const data = { page: window.location.href };
          analyticsTracker.send(data);
        }
      `);

      expect(issues.some((i) => i.rule.includes('privacy-violation'))).toBe(true);
    });

    test('flags fingerprinting', () => {
      const issues = runRules(`
        function getId() {
          const canvas = document.createElement('canvas');
          return canvas.toDataURL();
        }
      `);

      expect(issues.some((i) => i.rule.includes('fingerprint'))).toBe(true);
    });
  });

  describe('deceptive-abstraction rule', () => {
    test('flags innocuous name with tracking', () => {
      const issues = runRules(`
        function initApp() {
          trackUser();
          analytics.send({ event: 'init' });
        }
      `);

      expect(issues.some((i) => i.rule.includes('deceptive-abstraction'))).toBe(true);
    });
  });

  describe('Rule listing', () => {
    test('lists all built-in rules', () => {
      const rules = engine.listRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('description');
    });
  });

  describe('Rule config', () => {
    test('disables rules via config', () => {
      const customEngine = new RuleEngine({
        rules: {
          'misleading-name': false,
          'dark-pattern': 'off',
        },
      });

      const rules = customEngine.listRules();
      const mlRule = rules.find((r) => r.id === 'misleading-name');
      const dpRule = rules.find((r) => r.id === 'dark-pattern');

      expect(mlRule.enabled).toBe(false);
      expect(dpRule.enabled).toBe(false);
    });
  });
});
