'use strict';

const { parse } = require('../src/parser');
const { extractMetadata } = require('../src/analyzer/metadata');
const { analyzeSemantics } = require('../src/analyzer/semantic');

describe('Semantic Analyzer', () => {
  function getIssues(code, filename = 'test.js') {
    const ast = parse(code, filename);
    const metadata = extractMetadata(ast, code, filename);
    return analyzeSemantics(metadata, ast, code);
  }

  test('flags fetch function without network call', () => {
    const issues = getIssues(`
      function fetchUserData(id) {
        return { id, name: 'test' };
      }
    `);

    expect(issues.some((i) => i.rule === 'intent-behavior-mismatch')).toBe(true);
    expect(issues.some((i) => i.function === 'fetchUserData')).toBe(true);
  });

  test('does NOT flag fetch function WITH network call', () => {
    const issues = getIssues(`
      async function fetchUserData(id) {
        const res = await fetch('/api/users/' + id);
        return res.json();
      }
    `);

    const fetchIssues = issues.filter(
      (i) => i.rule === 'intent-behavior-mismatch' && i.function === 'fetchUserData'
    );
    expect(fetchIssues.length).toBe(0);
  });

  test('flags validate function without return', () => {
    const issues = getIssues(`
      function validateInput(input) {
        console.log('checking:', input);
      }
    `);

    expect(issues.some((i) => i.rule === 'intent-behavior-mismatch')).toBe(true);
  });

  test('does NOT flag validate function WITH return', () => {
    const issues = getIssues(`
      function validateInput(input) {
        return input.length > 0;
      }
    `);

    const valIssues = issues.filter(
      (i) => i.rule === 'intent-behavior-mismatch' && i.function === 'validateInput'
    );
    expect(valIssues.length).toBe(0);
  });

  test('flags empty function with meaningful name', () => {
    const issues = getIssues(`
      function processPayment(amount) {
        // TODO
      }
    `);

    expect(issues.some((i) => i.rule === 'empty-named-function')).toBe(true);
  });

  test('flags sanitize function without return', () => {
    const issues = getIssues(`
      function sanitizeHTML(input) {
        console.log('sanitizing...');
      }
    `);

    expect(issues.some((i) => i.function === 'sanitizeHTML')).toBe(true);
  });

  test('flags calculate function without return', () => {
    const issues = getIssues(`
      function calculateTotal(items) {
        let total = 0;
        items.forEach(i => { total += i.price; });
        console.log(total);
      }
    `);

    expect(issues.some((i) => i.function === 'calculateTotal')).toBe(true);
  });

  test('no issues for clean code', () => {
    const issues = getIssues(`
      function add(a, b) { return a + b; }
      function isValid(x) { return x > 0; }
    `);

    expect(issues.length).toBe(0);
  });
});
