'use strict';

const { parse } = require('./parser');
const { extractMetadata } = require('./analyzer/metadata');
const { analyzeSemantics } = require('./analyzer/semantic');
const { RuleEngine } = require('./rules');
const { AIAnalyzer } = require('./ai');
const { ScoreAggregator } = require('./scoring');
const { createReporter } = require('./reporter');

/**
 * MoralLint - Main analysis pipeline
 *
 * Orchestrates the full analysis: parse → extract → rules → AI → score → report
 */
class MoralLint {
  constructor(options = {}) {
    this.options = {
      ai: true,
      severity: 'info',
      format: 'cli',
      config: null,
      ...options,
    };

    this.ruleEngine = new RuleEngine(this.options.config);
    this.aiAnalyzer = this.options.ai ? new AIAnalyzer() : null;
    this.scorer = new ScoreAggregator();
  }

  /**
   * Analyze a single source code string
   * @param {string} code - Source code content
   * @param {string} filename - File path for context
   * @returns {object} Analysis results
   */
  async analyzeCode(code, filename = 'unknown.js') {
    const results = {
      file: filename,
      issues: [],
      metadata: null,
      score: null,
    };

    // Step 1: Parse into AST
    const ast = parse(code, filename);
    if (!ast) {
      results.issues.push({
        rule: 'parse-error',
        severity: 'error',
        message: `Failed to parse ${filename}`,
        line: 0,
        column: 0,
      });
      return results;
    }

    // Step 2: Extract metadata (functions, comments, names)
    const metadata = extractMetadata(ast, code, filename);
    results.metadata = metadata;

    // Step 3: Run semantic analysis (intent-behavior checks)
    const semanticIssues = analyzeSemantics(metadata, ast, code);
    results.issues.push(...semanticIssues);

    // Step 4: Run rule engine
    const ruleIssues = this.ruleEngine.run(ast, metadata, code, filename);
    results.issues.push(...ruleIssues);

    // Step 5: AI-assisted analysis (if enabled)
    if (this.aiAnalyzer && this.aiAnalyzer.isAvailable()) {
      try {
        const aiIssues = await this.aiAnalyzer.analyze(code, metadata, filename);
        results.issues.push(...aiIssues);
      } catch (err) {
        // AI failures are non-fatal
        results.issues.push({
          rule: 'ai-analysis-warning',
          severity: 'info',
          message: `AI analysis skipped: ${err.message}`,
          line: 0,
          column: 0,
        });
      }
    }

    // Step 6: Filter by severity
    const severityOrder = { info: 0, warning: 1, error: 2 };
    const minSev = severityOrder[this.options.severity] || 0;
    results.issues = results.issues.filter(
      (i) => (severityOrder[i.severity] || 0) >= minSev
    );

    // Step 7: Score
    results.score = this.scorer.scoreFile(results.issues);

    return results;
  }

  /**
   * Analyze multiple files and return aggregated results
   * @param {Array<{code: string, filename: string}>} files
   * @returns {object} Aggregated analysis results
   */
  async analyzeFiles(files) {
    const fileResults = [];

    for (const { code, filename } of files) {
      const result = await this.analyzeCode(code, filename);
      fileResults.push(result);
    }

    const aggregated = {
      files: fileResults,
      summary: this.scorer.aggregateProject(fileResults),
      timestamp: new Date().toISOString(),
    };

    return aggregated;
  }
}

module.exports = { MoralLint };
