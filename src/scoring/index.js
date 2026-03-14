'use strict';

/**
 * Score Aggregator
 *
 * Computes project-level and file-level quality metrics:
 * - Honesty Score: How well do names/docs match behavior?
 * - Ethics Risk Index: How many ethical concerns are present?
 * - Overall Trust Score: Combined confidence metric
 */

class ScoreAggregator {
  constructor() {
    this.weights = {
      error: 10,
      warning: 3,
      info: 1,
    };

    this.categoryWeights = {
      'semantic-consistency': 1.0,
      'ethical-compliance': 1.5,
      'ai-analysis': 0.8,
    };
  }

  /**
   * Score a single file based on its issues
   * @param {Array} issues - List of issues for this file
   * @returns {object} File score
   */
  scoreFile(issues) {
    const totalDeductions = issues.reduce((sum, issue) => {
      const sevWeight = this.weights[issue.severity] || 1;
      const catWeight = this.categoryWeights[issue.category] || 1.0;
      return sum + sevWeight * catWeight;
    }, 0);

    // Score is 0-100, starts at 100 and decreases
    const rawScore = Math.max(0, 100 - totalDeductions);

    const byCategory = {};
    for (const issue of issues) {
      const cat = issue.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, items: [] };
      byCategory[cat].count++;
      byCategory[cat].items.push(issue.rule);
    }

    const bySeverity = { error: 0, warning: 0, info: 0 };
    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    }

    return {
      trustScore: Math.round(rawScore),
      honestyScore: this._computeHonestyScore(issues),
      ethicsRiskIndex: this._computeEthicsRisk(issues),
      totalIssues: issues.length,
      bySeverity,
      byCategory,
      grade: this._scoreToGrade(rawScore),
    };
  }

  /**
   * Aggregate scores across all files in a project
   * @param {Array} fileResults - Array of per-file results
   * @returns {object} Project-level summary
   */
  aggregateProject(fileResults) {
    const allIssues = fileResults.flatMap((f) => f.issues);
    const fileScores = fileResults.map((f) => f.score).filter(Boolean);

    if (fileScores.length === 0) {
      return {
        trustScore: 100,
        honestyScore: 100,
        ethicsRiskIndex: 0,
        totalIssues: 0,
        totalFiles: fileResults.length,
        filesWithIssues: 0,
        bySeverity: { error: 0, warning: 0, info: 0 },
        grade: 'A+',
        topIssues: [],
      };
    }

    const avgTrust = Math.round(
      fileScores.reduce((s, f) => s + f.trustScore, 0) / fileScores.length
    );
    const avgHonesty = Math.round(
      fileScores.reduce((s, f) => s + f.honestyScore, 0) / fileScores.length
    );
    const totalEthicsRisk = fileScores.reduce(
      (s, f) => s + f.ethicsRiskIndex,
      0
    );

    const bySeverity = { error: 0, warning: 0, info: 0 };
    for (const score of fileScores) {
      bySeverity.error += score.bySeverity.error;
      bySeverity.warning += score.bySeverity.warning;
      bySeverity.info += score.bySeverity.info;
    }

    // Find most common issues
    const issueCounts = {};
    for (const issue of allIssues) {
      issueCounts[issue.rule] = (issueCounts[issue.rule] || 0) + 1;
    }
    const topIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rule, count]) => ({ rule, count }));

    return {
      trustScore: avgTrust,
      honestyScore: avgHonesty,
      ethicsRiskIndex: Math.round(totalEthicsRisk * 10) / 10,
      totalIssues: allIssues.length,
      totalFiles: fileResults.length,
      filesWithIssues: fileResults.filter((f) => f.issues.length > 0).length,
      bySeverity,
      grade: this._scoreToGrade(avgTrust),
      topIssues,
    };
  }

  _computeHonestyScore(issues) {
    const semanticIssues = issues.filter(
      (i) => i.category === 'semantic-consistency'
    );
    const deductions = semanticIssues.reduce(
      (sum, i) => sum + (this.weights[i.severity] || 1),
      0
    );
    return Math.max(0, Math.round(100 - deductions * 2));
  }

  _computeEthicsRisk(issues) {
    const ethicalIssues = issues.filter(
      (i) => i.category === 'ethical-compliance'
    );
    return ethicalIssues.reduce(
      (sum, i) => sum + (this.weights[i.severity] || 1) * 0.5,
      0
    );
  }

  _scoreToGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }
}

module.exports = { ScoreAggregator };
