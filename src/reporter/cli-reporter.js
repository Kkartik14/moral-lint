'use strict';

const chalk = require('chalk');

/**
 * CLI Reporter
 *
 * Renders analysis results as formatted terminal output with
 * colors, icons, and structured layout.
 */

class CLIReporter {
  constructor() {
    this.severityColors = {
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,
    };

    this.severityIcons = {
      error: chalk.red('✖'),
      warning: chalk.yellow('⚠'),
      info: chalk.blue('ℹ'),
    };
  }

  /**
   * Render full analysis results to console
   * @param {object} results - Aggregated analysis results
   */
  render(results) {
    console.log();
    this._renderHeader();

    if (results.files) {
      for (const file of results.files) {
        this._renderFile(file);
      }

      if (results.summary) {
        this._renderSummary(results.summary);
      }
    } else {
      // Single file result
      this._renderFile(results);
      if (results.score) {
        this._renderScore(results.score);
      }
    }

    console.log();
  }

  _renderHeader() {
    console.log(chalk.bold.cyan('  ╔══════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('  ║') + chalk.bold.white('        MORAL-LINT REPORT            ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));
    console.log();
  }

  _renderFile(file) {
    if (file.issues.length === 0) {
      console.log(chalk.green('  ✓ ') + chalk.dim(file.file) + chalk.green(' — No issues found'));
      return;
    }

    console.log(chalk.underline.white(`  ${file.file}`) + chalk.dim(` (${file.issues.length} issue${file.issues.length !== 1 ? 's' : ''})`));
    console.log();

    for (const issue of file.issues) {
      const icon = this.severityIcons[issue.severity] || '?';
      const colorFn = this.severityColors[issue.severity] || chalk.white;
      const location = issue.line > 0 ? chalk.dim(`:${issue.line}${issue.column > 0 ? ':' + issue.column : ''}`) : '';

      console.log(`    ${icon} ${colorFn(issue.message)} ${location}`);

      if (issue.detail) {
        console.log(chalk.dim(`      ${issue.detail}`));
      }

      if (issue.remediation) {
        console.log(chalk.green(`      💡 ${issue.remediation}`));
      }

      console.log(chalk.dim(`      Rule: ${issue.rule}  |  Category: ${issue.category || 'general'}`));
      console.log();
    }
  }

  _renderScore(score) {
    console.log(chalk.bold('  ─── Score ───'));
    console.log();

    const gradeColor = this._gradeColor(score.grade);
    console.log(`    Grade:            ${gradeColor(score.grade)}`);
    console.log(`    Trust Score:      ${this._scoreBar(score.trustScore)} ${score.trustScore}/100`);
    console.log(`    Honesty Score:    ${this._scoreBar(score.honestyScore)} ${score.honestyScore}/100`);
    console.log(`    Ethics Risk:      ${chalk.yellow(score.ethicsRiskIndex.toFixed(1))}`);
    console.log();
    console.log(`    ${chalk.red('✖')} Errors: ${score.bySeverity.error}  ${chalk.yellow('⚠')} Warnings: ${score.bySeverity.warning}  ${chalk.blue('ℹ')} Info: ${score.bySeverity.info}`);
  }

  _renderSummary(summary) {
    console.log();
    console.log(chalk.bold.cyan('  ═══════════════════════════════════════'));
    console.log(chalk.bold('  PROJECT SUMMARY'));
    console.log(chalk.bold.cyan('  ═══════════════════════════════════════'));
    console.log();

    const gradeColor = this._gradeColor(summary.grade);
    console.log(`    Overall Grade:     ${gradeColor(summary.grade)}`);
    console.log(`    Trust Score:       ${this._scoreBar(summary.trustScore)} ${summary.trustScore}/100`);
    console.log(`    Honesty Score:     ${this._scoreBar(summary.honestyScore)} ${summary.honestyScore}/100`);
    console.log(`    Ethics Risk Index: ${chalk.yellow(summary.ethicsRiskIndex.toFixed(1))}`);
    console.log();
    console.log(`    Files Analyzed:    ${summary.totalFiles}`);
    console.log(`    Files with Issues: ${summary.filesWithIssues}`);
    console.log(`    Total Issues:      ${summary.totalIssues}`);
    console.log(`      ${chalk.red('✖')} Errors: ${summary.bySeverity.error}`);
    console.log(`      ${chalk.yellow('⚠')} Warnings: ${summary.bySeverity.warning}`);
    console.log(`      ${chalk.blue('ℹ')} Info: ${summary.bySeverity.info}`);

    if (summary.topIssues && summary.topIssues.length > 0) {
      console.log();
      console.log(chalk.bold('    Top Issues:'));
      for (const ti of summary.topIssues) {
        console.log(`      ${chalk.dim('•')} ${ti.rule} ${chalk.dim(`(${ti.count}x)`)}`);
      }
    }

    console.log();
  }

  _scoreBar(score) {
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  }

  _gradeColor(grade) {
    if (grade.startsWith('A')) return chalk.green.bold;
    if (grade.startsWith('B')) return chalk.cyan.bold;
    if (grade.startsWith('C')) return chalk.yellow.bold;
    if (grade.startsWith('D')) return chalk.red.bold;
    return chalk.red.bold;
  }
}

module.exports = { CLIReporter };
