'use strict';

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const ora = require('ora');
const { MoralLint } = require('./index');
const { createReporter } = require('./reporter');

/**
 * CLI Analysis Pipeline
 *
 * Discovers files, runs analysis, and reports results.
 */

const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
  '**/vendor/**',
  '**/*.min.js',
  '**/*.bundle.js',
];

/**
 * Main analysis entry point for the CLI
 * @param {string} targetPath - File or directory to analyze
 * @param {object} options - CLI options
 */
async function analyze(targetPath, options = {}) {
  const spinner = ora({ text: 'Discovering files...', color: 'cyan' }).start();

  try {
    // Load config
    const config = loadConfig(options.config, targetPath);

    // Discover files
    const files = await discoverFiles(targetPath, config);

    if (files.length === 0) {
      spinner.warn('No JavaScript/TypeScript files found.');
      return;
    }

    spinner.text = `Analyzing ${files.length} file${files.length !== 1 ? 's' : ''}...`;

    // Initialize linter
    const linter = new MoralLint({
      ai: options.ai !== false,
      severity: options.severity || config.severity || 'info',
      format: options.format || 'cli',
      config,
    });

    // Read and analyze files
    const fileInputs = [];
    for (const filePath of files) {
      try {
        const code = fs.readFileSync(filePath, 'utf-8');
        fileInputs.push({ code, filename: path.relative(process.cwd(), filePath) });
      } catch (err) {
        // Skip unreadable files
      }
    }

    const results = await linter.analyzeFiles(fileInputs);

    spinner.succeed(`Analysis complete. ${results.summary.totalIssues} issue${results.summary.totalIssues !== 1 ? 's' : ''} found in ${files.length} file${files.length !== 1 ? 's' : ''}.`);

    // Report
    const reporter = createReporter(options.format || 'cli');
    reporter.render(results, options.output);

    // Exit with non-zero if errors found
    if (results.summary.bySeverity.error > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    spinner.fail(`Analysis failed: ${err.message}`);
    process.exitCode = 1;
  }
}

/**
 * Discover all analyzable files
 */
async function discoverFiles(targetPath, config = {}) {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      return [targetPath];
    }
    return [];
  }

  if (stat.isDirectory()) {
    const ignorePatterns = [...DEFAULT_IGNORE, ...(config.ignore || [])];
    const pattern = `**/*{${SUPPORTED_EXTENSIONS.join(',')}}`;

    const files = await glob(pattern, {
      cwd: targetPath,
      absolute: true,
      ignore: ignorePatterns,
      nodir: true,
    });

    return files;
  }

  return [];
}

/**
 * Load configuration from file
 */
function loadConfig(configPath, targetDir) {
  const searchPaths = [
    configPath,
    path.join(targetDir || process.cwd(), '.morallint.config.js'),
    path.join(targetDir || process.cwd(), '.morallint.config.json'),
    path.join(targetDir || process.cwd(), '.morallintrc.json'),
  ].filter(Boolean);

  for (const p of searchPaths) {
    try {
      if (fs.existsSync(p)) {
        return require(p);
      }
    } catch {
      // Skip invalid configs
    }
  }

  return {};
}

module.exports = { analyze };
