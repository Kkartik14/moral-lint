'use strict';

const { ScoreAggregator } = require('../src/scoring');

describe('Score Aggregator', () => {
  const scorer = new ScoreAggregator();

  test('perfect score for no issues', () => {
    const score = scorer.scoreFile([]);
    expect(score.trustScore).toBe(100);
    expect(score.grade).toBe('A+');
    expect(score.totalIssues).toBe(0);
  });

  test('reduces score for warnings', () => {
    const issues = [
      { rule: 'test', severity: 'warning', category: 'semantic-consistency' },
      { rule: 'test', severity: 'warning', category: 'semantic-consistency' },
    ];
    const score = scorer.scoreFile(issues);
    expect(score.trustScore).toBeLessThan(100);
    expect(score.bySeverity.warning).toBe(2);
  });

  test('errors reduce score more than warnings', () => {
    const warningIssues = [
      { rule: 'test', severity: 'warning', category: 'semantic-consistency' },
    ];
    const errorIssues = [
      { rule: 'test', severity: 'error', category: 'semantic-consistency' },
    ];

    const warningScore = scorer.scoreFile(warningIssues);
    const errorScore = scorer.scoreFile(errorIssues);

    expect(errorScore.trustScore).toBeLessThan(warningScore.trustScore);
  });

  test('ethical issues have higher weight', () => {
    const semanticIssue = [
      { rule: 'test', severity: 'warning', category: 'semantic-consistency' },
    ];
    const ethicalIssue = [
      { rule: 'test', severity: 'warning', category: 'ethical-compliance' },
    ];

    const semanticScore = scorer.scoreFile(semanticIssue);
    const ethicalScore = scorer.scoreFile(ethicalIssue);

    expect(ethicalScore.trustScore).toBeLessThan(semanticScore.trustScore);
  });

  test('aggregates project scores', () => {
    const fileResults = [
      { issues: [], score: scorer.scoreFile([]) },
      {
        issues: [{ rule: 'test', severity: 'warning', category: 'semantic-consistency' }],
        score: scorer.scoreFile([{ rule: 'test', severity: 'warning', category: 'semantic-consistency' }]),
      },
    ];

    const summary = scorer.aggregateProject(fileResults);

    expect(summary.totalFiles).toBe(2);
    expect(summary.filesWithIssues).toBe(1);
    expect(summary.totalIssues).toBe(1);
    expect(summary.grade).toBeDefined();
  });

  test('grade assignment is correct', () => {
    // No issues = A+
    const perfect = scorer.scoreFile([]);
    expect(perfect.grade).toBe('A+');

    // Many errors = low grade
    const manyErrors = Array(20).fill({
      rule: 'test',
      severity: 'error',
      category: 'ethical-compliance',
    });
    const terrible = scorer.scoreFile(manyErrors);
    expect(terrible.grade).toBe('F');
  });
});
