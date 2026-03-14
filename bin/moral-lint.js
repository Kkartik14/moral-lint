#!/usr/bin/env node

'use strict';

require('dotenv').config();
const { program } = require('commander');
const path = require('path');
const { analyze } = require('../src/cli');
const pkg = require('../package.json');

program
  .name('moral-lint')
  .description(pkg.description)
  .version(pkg.version);

program
  .command('analyze [target]')
  .alias('a')
  .description('Analyze a file or directory for semantic and ethical issues')
  .option('-f, --format <format>', 'Output format: cli, json', 'cli')
  .option('-c, --config <path>', 'Path to config file')
  .option('--no-ai', 'Disable AI-assisted analysis')
  .option('--severity <level>', 'Minimum severity to report: info, warning, error', 'info')
  .option('-o, --output <path>', 'Write JSON report to file')
  .action(async (target, options) => {
    const targetPath = target ? path.resolve(target) : process.cwd();
    await analyze(targetPath, options);
  });

program
  .command('report [target]')
  .alias('r')
  .description('Generate a detailed report for a file or directory')
  .option('-o, --output <path>', 'Write report to file')
  .option('--no-ai', 'Disable AI-assisted analysis')
  .action(async (target, options) => {
    const targetPath = target ? path.resolve(target) : process.cwd();
    await analyze(targetPath, { ...options, format: 'json' });
  });

// Default command: analyze current directory
if (process.argv.length <= 2) {
  process.argv.push('analyze', '.');
}

program.parse();
