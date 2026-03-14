'use strict';

/**
 * Semantic Analyzer
 *
 * Detects intent–behavior mismatches by comparing function names,
 * comments, and documentation against actual code behavior.
 */

// --- Name-to-behavior mapping rules ---

const NAME_PATTERNS = {
  fetch: {
    keywords: ['fetch', 'get', 'load', 'retrieve', 'pull', 'download', 'request'],
    expectedBehaviors: ['hasNetworkCall'],
    description: 'implies network data retrieval',
  },
  save: {
    keywords: ['save', 'store', 'persist', 'write', 'upload', 'put', 'post', 'send'],
    expectedBehaviors: ['hasNetworkCall', 'hasFileAccess'],
    description: 'implies data persistence (network or file)',
  },
  delete: {
    keywords: ['delete', 'remove', 'destroy', 'drop', 'clear', 'purge', 'erase'],
    expectedBehaviors: ['hasNetworkCall', 'hasFileAccess', 'hasDOMAccess'],
    description: 'implies data removal',
  },
  validate: {
    keywords: ['validate', 'verify', 'check', 'assert', 'ensure', 'confirm'],
    expectedBehaviors: ['hasReturnValue'],
    description: 'implies returning a validation result',
  },
  sanitize: {
    keywords: ['sanitize', 'escape', 'clean', 'filter', 'purify', 'strip'],
    expectedBehaviors: ['hasReturnValue'],
    description: 'implies transforming and returning cleaned data',
  },
  render: {
    keywords: ['render', 'display', 'show', 'draw', 'paint', 'present'],
    expectedBehaviors: ['hasDOMAccess'],
    description: 'implies DOM/UI manipulation',
  },
  calculate: {
    keywords: ['calculate', 'compute', 'sum', 'count', 'measure', 'estimate'],
    expectedBehaviors: ['hasReturnValue'],
    description: 'implies computation and returning a result',
  },
  format: {
    keywords: ['format', 'transform', 'convert', 'parse', 'serialize', 'stringify'],
    expectedBehaviors: ['hasReturnValue'],
    description: 'implies data transformation and return',
  },
};

/**
 * Analyze semantic consistency between function names and their behavior
 * @param {object} metadata - Extracted metadata
 * @param {object} ast - The AST
 * @param {string} code - Source code
 * @returns {Array} List of semantic issues
 */
function analyzeSemantics(metadata, ast, code) {
  const issues = [];

  for (const fn of metadata.functions) {
    // Skip anonymous, constructors, and very short functions
    if (fn.name === '<anonymous>' || fn.name === '<computed>') continue;
    if (fn.name === 'constructor') continue;

    const nameLower = fn.name.toLowerCase();

    // Check each pattern category
    for (const [category, pattern] of Object.entries(NAME_PATTERNS)) {
      const matchedKeyword = pattern.keywords.find((kw) => {
        // Match keyword at word boundaries in camelCase/snake_case names
        const parts = nameLower
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toLowerCase()
          .split(/[_\-\s]+/);
        return parts.some((part) => part === kw || part.startsWith(kw));
      });

      if (!matchedKeyword) continue;

      // Check if any expected behavior is present
      const hasExpectedBehavior = pattern.expectedBehaviors.some((behavior) => {
        if (behavior === 'hasReturnValue') {
          return fn.returnStatements.some((r) => r.hasValue);
        }
        return fn[behavior] === true;
      });

      if (!hasExpectedBehavior) {
        issues.push({
          rule: 'intent-behavior-mismatch',
          severity: 'warning',
          message: `Function "${fn.name}" ${pattern.description}, but no matching behavior detected in its implementation.`,
          detail: `The name contains "${matchedKeyword}" which suggests ${category} operations, but the function body does not appear to perform any. This could be a misleading abstraction or incomplete implementation.`,
          line: fn.loc ? fn.loc.start.line : 0,
          column: fn.loc ? fn.loc.start.column : 0,
          category: 'semantic-consistency',
          function: fn.name,
        });
      }
    }

    // Check for empty functions that have meaningful names
    if (fn.name.length > 3 && isEmptyFunction(fn)) {
      issues.push({
        rule: 'empty-named-function',
        severity: 'warning',
        message: `Function "${fn.name}" has a descriptive name but an empty body.`,
        detail: 'A function with a meaningful name that does nothing is misleading to other developers. It may be a stub that was never implemented.',
        line: fn.loc ? fn.loc.start.line : 0,
        column: fn.loc ? fn.loc.start.column : 0,
        category: 'semantic-consistency',
        function: fn.name,
      });
    }

    // Check for comment-code contradiction
    checkCommentContradictions(fn, issues);

    // Check for facade/passthrough functions that hide behavior
    checkFacadePatterns(fn, issues);
  }

  return issues;
}

/**
 * Check if a function body is effectively empty
 */
function isEmptyFunction(fn) {
  if (!fn.body) return false;
  // Remove the function signature and braces, check if body is empty
  const bodyContent = fn.body
    .replace(/^[^{]*\{/, '')
    .replace(/\}[^}]*$/, '')
    .trim();
  return bodyContent === '' || bodyContent === '// TODO' || bodyContent === '// todo';
}

/**
 * Check for contradictions between leading comments and function behavior
 */
function checkCommentContradictions(fn, issues) {
  if (!fn.leadingComments || fn.leadingComments.length === 0) return;

  const commentText = fn.leadingComments.join(' ').toLowerCase();
  const nameLower = fn.name.toLowerCase();

  // Comment says "pure" but function has side effects
  if (
    (commentText.includes('pure') || commentText.includes('no side effect')) &&
    (fn.hasNetworkCall || fn.hasDOMAccess || fn.hasFileAccess)
  ) {
    issues.push({
      rule: 'comment-behavior-mismatch',
      severity: 'warning',
      message: `Function "${fn.name}" is documented as pure/side-effect-free but performs side effects.`,
      detail: 'The comment claims this function is pure, but it accesses network, DOM, or file system APIs.',
      line: fn.loc ? fn.loc.start.line : 0,
      column: fn.loc ? fn.loc.start.column : 0,
      category: 'semantic-consistency',
      function: fn.name,
    });
  }

  // Comment says "returns" but function has no return value
  if (
    commentText.includes('@returns') &&
    fn.returnStatements.length === 0
  ) {
    issues.push({
      rule: 'comment-behavior-mismatch',
      severity: 'info',
      message: `Function "${fn.name}" has a @returns tag but never returns a value.`,
      detail: 'The JSDoc documents a return value, but no return statement was found.',
      line: fn.loc ? fn.loc.start.line : 0,
      column: fn.loc ? fn.loc.start.column : 0,
      category: 'semantic-consistency',
      function: fn.name,
    });
  }
}

/**
 * Check for facade/wrapper patterns that silently modify behavior
 */
function checkFacadePatterns(fn, issues) {
  // Function that delegates to a single call but has a misleadingly different name
  if (fn.callees.length === 1 && fn.name !== fn.callees[0]) {
    const callee = fn.callees[0];
    const nameWords = splitCamelCase(fn.name).map((w) => w.toLowerCase());
    const calleeWords = splitCamelCase(callee).map((w) => w.toLowerCase());

    // Check if the names are semantically very different
    const overlap = nameWords.filter((w) => calleeWords.includes(w));
    if (overlap.length === 0 && nameWords.length > 1 && calleeWords.length > 1) {
      issues.push({
        rule: 'deceptive-facade',
        severity: 'info',
        message: `Function "${fn.name}" is a thin wrapper around "${callee}" with no obvious naming relation.`,
        detail: 'This function delegates entirely to another function with a semantically different name. This could obscure the actual behavior from code reviewers.',
        line: fn.loc ? fn.loc.start.line : 0,
        column: fn.loc ? fn.loc.start.column : 0,
        category: 'semantic-consistency',
        function: fn.name,
      });
    }
  }
}

function splitCamelCase(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean);
}

module.exports = { analyzeSemantics };
