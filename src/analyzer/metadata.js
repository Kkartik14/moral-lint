'use strict';

const traverse = require('@babel/traverse').default;

/**
 * Metadata Extractor
 *
 * Extracts functions, variables, comments, JSDoc, imports/exports,
 * and other structural metadata from an AST for downstream analysis.
 */

/**
 * Extract all metadata from a parsed AST
 * @param {object} ast - Babel AST
 * @param {string} code - Original source code
 * @param {string} filename - Source filename
 * @returns {object} Extracted metadata
 */
function extractMetadata(ast, code, filename) {
  const metadata = {
    filename,
    functions: [],
    variables: [],
    imports: [],
    exports: [],
    comments: ast.comments || [],
    classes: [],
    callExpressions: [],
  };

  const lines = code.split('\n');

  traverse(ast, {
    // Extract function declarations
    FunctionDeclaration(path) {
      const node = path.node;
      metadata.functions.push({
        name: node.id ? node.id.name : '<anonymous>',
        type: 'FunctionDeclaration',
        params: node.params.map(paramName),
        loc: node.loc,
        body: code.slice(node.start, node.end),
        leadingComments: extractLeadingComments(node, path),
        isAsync: node.async,
        isGenerator: node.generator,
        returnStatements: collectReturns(path),
        callees: collectCallees(path),
        hasNetworkCall: hasNetworkCall(path),
        hasDOMAccess: hasDOMAccess(path),
        hasFileAccess: hasFileAccess(path),
        hasSensitiveAPI: hasSensitiveAPI(path),
      });
    },

    // Extract arrow functions and function expressions assigned to variables
    VariableDeclarator(path) {
      const node = path.node;
      const init = node.init;

      if (
        init &&
        (init.type === 'ArrowFunctionExpression' ||
          init.type === 'FunctionExpression')
      ) {
        metadata.functions.push({
          name: node.id ? node.id.name : '<anonymous>',
          type: init.type,
          params: init.params.map(paramName),
          loc: node.loc,
          body: code.slice(node.start, node.end),
          leadingComments: extractLeadingComments(node, path),
          isAsync: init.async,
          isGenerator: init.generator,
          returnStatements: collectReturns(path),
          callees: collectCallees(path),
          hasNetworkCall: hasNetworkCall(path),
          hasDOMAccess: hasDOMAccess(path),
          hasFileAccess: hasFileAccess(path),
          hasSensitiveAPI: hasSensitiveAPI(path),
        });
      } else {
        metadata.variables.push({
          name: node.id ? node.id.name : '<unknown>',
          loc: node.loc,
          kind: path.parent.kind,
          hasInit: !!init,
          initType: init ? init.type : null,
        });
      }
    },

    // Extract class methods
    ClassMethod(path) {
      const node = path.node;
      metadata.functions.push({
        name: node.key ? node.key.name || node.key.value : '<computed>',
        type: 'ClassMethod',
        kind: node.kind, // constructor, method, get, set
        params: node.params.map(paramName),
        loc: node.loc,
        body: code.slice(node.start, node.end),
        leadingComments: extractLeadingComments(node, path),
        isAsync: node.async,
        isGenerator: node.generator,
        isStatic: node.static,
        returnStatements: collectReturns(path),
        callees: collectCallees(path),
        hasNetworkCall: hasNetworkCall(path),
        hasDOMAccess: hasDOMAccess(path),
        hasFileAccess: hasFileAccess(path),
        hasSensitiveAPI: hasSensitiveAPI(path),
      });
    },

    // Extract class declarations
    ClassDeclaration(path) {
      const node = path.node;
      metadata.classes.push({
        name: node.id ? node.id.name : '<anonymous>',
        superClass: node.superClass
          ? code.slice(node.superClass.start, node.superClass.end)
          : null,
        loc: node.loc,
        leadingComments: extractLeadingComments(node, path),
      });
    },

    // Track imports
    ImportDeclaration(path) {
      const node = path.node;
      metadata.imports.push({
        source: node.source.value,
        specifiers: node.specifiers.map((s) => ({
          type: s.type,
          local: s.local ? s.local.name : null,
          imported: s.imported ? s.imported.name : null,
        })),
        loc: node.loc,
      });
    },

    // Track exports
    ExportNamedDeclaration(path) {
      const node = path.node;
      metadata.exports.push({
        type: 'named',
        declaration: node.declaration
          ? code.slice(node.declaration.start, node.declaration.end).slice(0, 80)
          : null,
        specifiers: node.specifiers.map((s) => s.exported.name),
        loc: node.loc,
      });
    },

    ExportDefaultDeclaration(path) {
      const node = path.node;
      metadata.exports.push({
        type: 'default',
        declaration: code.slice(node.declaration.start, node.declaration.end).slice(0, 80),
        loc: node.loc,
      });
    },

    // Track all call expressions (for call graph)
    CallExpression(path) {
      const node = path.node;
      let calleeName = '';

      if (node.callee.type === 'Identifier') {
        calleeName = node.callee.name;
      } else if (node.callee.type === 'MemberExpression') {
        calleeName = memberExpressionToString(node.callee);
      }

      if (calleeName) {
        metadata.callExpressions.push({
          name: calleeName,
          args: node.arguments.length,
          loc: node.loc,
        });
      }
    },
  });

  return metadata;
}

// --- Helpers ---

function paramName(param) {
  if (param.type === 'Identifier') return param.name;
  if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier')
    return param.left.name;
  if (param.type === 'RestElement' && param.argument.type === 'Identifier')
    return '...' + param.argument.name;
  if (param.type === 'ObjectPattern') return '{...}';
  if (param.type === 'ArrayPattern') return '[...]';
  return '<complex>';
}

function extractLeadingComments(node, path) {
  const comments = [];
  if (node.leadingComments) {
    comments.push(...node.leadingComments.map((c) => c.value.trim()));
  }
  // Also check parent for variable declarations
  if (path.parent && path.parent.leadingComments) {
    comments.push(...path.parent.leadingComments.map((c) => c.value.trim()));
  }
  return comments;
}

function collectReturns(path) {
  const returns = [];
  path.traverse({
    ReturnStatement(retPath) {
      returns.push({
        hasValue: !!retPath.node.argument,
        loc: retPath.node.loc,
      });
    },
  });
  return returns;
}

function collectCallees(path) {
  const callees = [];
  path.traverse({
    CallExpression(callPath) {
      const node = callPath.node;
      if (node.callee.type === 'Identifier') {
        callees.push(node.callee.name);
      } else if (node.callee.type === 'MemberExpression') {
        callees.push(memberExpressionToString(node.callee));
      }
    },
  });
  return [...new Set(callees)];
}

function memberExpressionToString(node) {
  const parts = [];
  let current = node;
  while (current.type === 'MemberExpression') {
    if (current.property.type === 'Identifier') {
      parts.unshift(current.property.name);
    }
    current = current.object;
  }
  if (current.type === 'Identifier') {
    parts.unshift(current.name);
  }
  return parts.join('.');
}

const NETWORK_APIS = [
  'fetch', 'axios', 'http.get', 'http.post', 'http.request',
  'https.get', 'https.post', 'https.request',
  'XMLHttpRequest', 'request', 'got', 'superagent',
  'axios.get', 'axios.post', 'axios.put', 'axios.delete',
  'fetch', 'net.connect', 'net.createConnection',
];

const DOM_APIS = [
  'document.getElementById', 'document.querySelector',
  'document.querySelectorAll', 'document.createElement',
  'document.write', 'innerHTML', 'outerHTML',
  'addEventListener', 'removeEventListener',
  'window.location', 'window.open', 'document.cookie',
];

const FILE_APIS = [
  'fs.readFile', 'fs.writeFile', 'fs.readFileSync', 'fs.writeFileSync',
  'fs.unlink', 'fs.unlinkSync', 'fs.rmdir', 'fs.mkdir',
  'fs.readdir', 'fs.readdirSync', 'fs.access',
  'fs.promises.readFile', 'fs.promises.writeFile',
];

const SENSITIVE_APIS = [
  'navigator.geolocation', 'navigator.camera',
  'navigator.mediaDevices', 'navigator.bluetooth',
  'navigator.usb', 'navigator.credentials',
  'crypto', 'eval', 'Function',
  'localStorage', 'sessionStorage', 'indexedDB',
  'document.cookie', 'navigator.sendBeacon',
  'Notification', 'PaymentRequest',
];

function hasNetworkCall(path) {
  let found = false;
  path.traverse({
    CallExpression(callPath) {
      const name = calleeToString(callPath.node.callee);
      if (NETWORK_APIS.some((api) => name.includes(api))) found = true;
    },
  });
  return found;
}

function hasDOMAccess(path) {
  let found = false;
  path.traverse({
    MemberExpression(mPath) {
      const name = memberExpressionToString(mPath.node);
      if (DOM_APIS.some((api) => name.includes(api))) found = true;
    },
  });
  return found;
}

function hasFileAccess(path) {
  let found = false;
  path.traverse({
    CallExpression(callPath) {
      const name = calleeToString(callPath.node.callee);
      if (FILE_APIS.some((api) => name.includes(api))) found = true;
    },
  });
  return found;
}

function hasSensitiveAPI(path) {
  let found = false;
  path.traverse({
    MemberExpression(mPath) {
      const name = memberExpressionToString(mPath.node);
      if (SENSITIVE_APIS.some((api) => name.includes(api))) found = true;
    },
    CallExpression(callPath) {
      const name = calleeToString(callPath.node.callee);
      if (SENSITIVE_APIS.some((api) => name.includes(api))) found = true;
    },
  });
  return found;
}

function calleeToString(callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') return memberExpressionToString(callee);
  return '';
}

module.exports = { extractMetadata };
