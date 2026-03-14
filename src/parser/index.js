'use strict';

const babelParser = require('@babel/parser');
const path = require('path');

/**
 * Parser module - Generates ASTs from JavaScript/TypeScript source code
 * using Babel parser with broad plugin support.
 */

const BABEL_PLUGINS = [
  'jsx',
  'typescript',
  'decorators-legacy',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'dynamicImport',
  'nullishCoalescingOperator',
  'optionalChaining',
  'optionalCatchBinding',
  'topLevelAwait',
];

/**
 * Parse source code into an AST
 * @param {string} code - Source code string
 * @param {string} filename - Filename for determining parser options
 * @returns {object|null} AST or null on parse failure
 */
function parse(code, filename = 'unknown.js') {
  const ext = path.extname(filename).toLowerCase();
  const isTypeScript = ext === '.ts' || ext === '.tsx';
  const isJSX = ext === '.jsx' || ext === '.tsx';

  const plugins = [...BABEL_PLUGINS];
  if (!isTypeScript) {
    // Remove typescript plugin for plain JS
    const tsIdx = plugins.indexOf('typescript');
    if (tsIdx > -1) plugins.splice(tsIdx, 1);
    plugins.push('flow');
  }

  try {
    const ast = babelParser.parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      plugins,
      errorRecovery: true,
    });

    return ast;
  } catch (err) {
    // Try again as script
    try {
      const ast = babelParser.parse(code, {
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        plugins,
        errorRecovery: true,
      });
      return ast;
    } catch (err2) {
      return null;
    }
  }
}

module.exports = { parse };
