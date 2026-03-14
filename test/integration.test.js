'use strict';

const fs = require('fs');
const path = require('path');
const { MoralLint } = require('../src/index');

describe('Integration Tests', () => {
  const linter = new MoralLint({ ai: false, severity: 'info' });

  test('clean code produces high trust score', async () => {
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/clean-code.js'),
      'utf-8'
    );
    const result = await linter.analyzeCode(code, 'clean-code.js');

    expect(result.score.trustScore).toBeGreaterThanOrEqual(80);
    expect(result.score.grade).toMatch(/^[AB]/);
  });

  test('misleading names fixture produces issues', async () => {
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/misleading-names.js'),
      'utf-8'
    );
    const result = await linter.analyzeCode(code, 'misleading-names.js');

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.rule === 'intent-behavior-mismatch')).toBe(true);
  });

  test('consent bypass fixture produces errors', async () => {
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/consent-bypass.js'),
      'utf-8'
    );
    const result = await linter.analyzeCode(code, 'consent-bypass.js');

    expect(result.issues.some((i) => i.rule === 'consent-bypass')).toBe(true);
  });

  test('dark patterns fixture produces warnings', async () => {
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/dark-patterns.js'),
      'utf-8'
    );
    const result = await linter.analyzeCode(code, 'dark-patterns.js');

    expect(result.issues.some((i) => i.rule.startsWith('dark-pattern'))).toBe(true);
  });

  test('privacy violations fixture produces warnings', async () => {
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/privacy-violations.js'),
      'utf-8'
    );
    const result = await linter.analyzeCode(code, 'privacy-violations.js');

    expect(result.issues.some((i) => i.rule.includes('privacy-violation'))).toBe(true);
  });

  test('multi-file analysis produces project summary', async () => {
    const files = ['clean-code.js', 'misleading-names.js', 'dark-patterns.js'].map((f) => ({
      code: fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf-8'),
      filename: f,
    }));

    const results = await linter.analyzeFiles(files);

    expect(results.files.length).toBe(3);
    expect(results.summary).toBeDefined();
    expect(results.summary.totalFiles).toBe(3);
    expect(results.summary.totalIssues).toBeGreaterThan(0);
    expect(results.summary.grade).toBeDefined();
    expect(results.timestamp).toBeDefined();
  });

  test('severity filtering works', async () => {
    const errorOnlyLinter = new MoralLint({ ai: false, severity: 'error' });
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/consent-bypass.js'),
      'utf-8'
    );
    const result = await errorOnlyLinter.analyzeCode(code, 'consent-bypass.js');

    // All issues should be error severity
    for (const issue of result.issues) {
      expect(issue.severity).toBe('error');
    }
  });

  test('scoring produces valid scores', async () => {
    const code = fs.readFileSync(
      path.join(__dirname, 'fixtures/dark-patterns.js'),
      'utf-8'
    );
    const result = await linter.analyzeCode(code, 'dark-patterns.js');

    expect(result.score.trustScore).toBeGreaterThanOrEqual(0);
    expect(result.score.trustScore).toBeLessThanOrEqual(100);
    expect(result.score.honestyScore).toBeGreaterThanOrEqual(0);
    expect(result.score.honestyScore).toBeLessThanOrEqual(100);
    expect(result.score.ethicsRiskIndex).toBeGreaterThanOrEqual(0);
  });
});
