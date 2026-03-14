'use strict';

const https = require('https');
const http = require('http');

/**
 * AI Analyzer
 *
 * Uses OpenRouter API to get LLM-powered analysis of code snippets.
 * Provides contextual explanations and deeper semantic understanding
 * that goes beyond pattern matching.
 */

class AIAnalyzer {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
    this.model = options.model || process.env.OPENROUTER_MODEL || 'openrouter/hunter-alpha';
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.timeout = options.timeout || 60000;
    this.maxCodeLength = options.maxCodeLength || 3000;
  }

  /**
   * Check if AI analysis is available (API key configured)
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Analyze code using the LLM for deeper semantic/ethical issues
   * @param {string} code - Source code
   * @param {object} metadata - Extracted metadata
   * @param {string} filename - File name
   * @returns {Array} AI-detected issues
   */
  async analyze(code, metadata, filename) {
    if (!this.isAvailable()) {
      return [];
    }

    // Extract minimal context for the LLM (to save tokens)
    const context = this._buildContext(code, metadata, filename);

    const prompt = this._buildPrompt(context);

    try {
      const response = await this._callAPI(prompt);
      const issues = this._parseResponse(response, filename);
      return issues;
    } catch (err) {
      throw new Error(`AI analysis failed: ${err.message}`);
    }
  }

  /**
   * Build minimal code context for the LLM
   */
  _buildContext(code, metadata, filename) {
    // Truncate code if too long
    const truncatedCode = code.length > this.maxCodeLength
      ? code.slice(0, this.maxCodeLength) + '\n// ... (truncated)'
      : code;

    const functionSummaries = metadata.functions.slice(0, 15).map((fn) => ({
      name: fn.name,
      params: fn.params,
      isAsync: fn.isAsync,
      hasNetworkCall: fn.hasNetworkCall,
      hasSensitiveAPI: fn.hasSensitiveAPI,
      callees: fn.callees.slice(0, 10),
      comments: fn.leadingComments.slice(0, 2),
    }));

    return {
      filename,
      code: truncatedCode,
      functions: functionSummaries,
      imports: metadata.imports.map((i) => i.source),
      exports: metadata.exports.map((e) => e.type + ': ' + (e.declaration || e.specifiers?.join(', '))),
    };
  }

  /**
   * Build the analysis prompt
   */
  _buildPrompt(context) {
    return [
      {
        role: 'system',
        content: `You are Moral-Lint, an AI code ethics analyzer. Your job is to review code for:

1. **Intent-Behavior Mismatches**: Functions whose names/docs don't match what they actually do
2. **Ethical Concerns**: Dark patterns, privacy violations, consent bypass, deceptive code
3. **Hidden Side Effects**: Code that does more (or less) than what its interface suggests
4. **Trust Violations**: Code that could erode user trust

Respond ONLY with a JSON array of issues found. Each issue must have:
- "rule": string (e.g., "ai/intent-mismatch", "ai/ethical-concern", "ai/hidden-side-effect")
- "severity": "info" | "warning" | "error"
- "message": string (concise description)
- "detail": string (human-readable explanation of why this is concerning)
- "function": string or null (function name if applicable)
- "line": number (approximate line, or 0)
- "remediation": string (suggestion to fix)

If no issues are found, return an empty array [].
Be conservative — only flag real concerns, not speculative ones. Aim for <10% false positive rate.`,
      },
      {
        role: 'user',
        content: `Analyze this file for semantic and ethical issues:

**File:** ${context.filename}
**Imports:** ${context.imports.join(', ') || 'none'}
**Exports:** ${context.exports.join(', ') || 'none'}
**Functions:** ${JSON.stringify(context.functions, null, 2)}

**Code:**
\`\`\`
${context.code}
\`\`\``,
      },
    ];
  }

  /**
   * Call the OpenRouter API
   */
  async _callAPI(messages) {
    const body = JSON.stringify({
      model: this.model,
      messages,
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/moral-lint',
          'X-Title': 'Moral-Lint',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.timeout,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`API returned ${res.statusCode}: ${data.slice(0, 200)}`));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.message?.content;
            if (!content) {
              reject(new Error('Empty response from AI'));
              return;
            }
            resolve(content);
          } catch (err) {
            reject(new Error(`Failed to parse API response: ${err.message}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API request timed out'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Parse the LLM response into structured issues
   */
  _parseResponse(response, filename) {
    try {
      let parsed = JSON.parse(response);

      // Handle wrapped response
      if (parsed.issues) parsed = parsed.issues;
      if (!Array.isArray(parsed)) parsed = [parsed];

      return parsed
        .filter((item) => item && item.rule && item.message)
        .map((item) => ({
          rule: item.rule || 'ai/unknown',
          severity: ['info', 'warning', 'error'].includes(item.severity) ? item.severity : 'info',
          message: String(item.message),
          detail: String(item.detail || ''),
          line: Number(item.line) || 0,
          column: 0,
          category: 'ai-analysis',
          function: item.function || null,
          remediation: item.remediation || null,
          source: 'ai',
        }));
    } catch (err) {
      // If JSON parse fails, try to extract issues from text
      return [{
        rule: 'ai/analysis',
        severity: 'info',
        message: response.slice(0, 200),
        detail: 'AI provided a text response instead of structured JSON.',
        line: 0,
        column: 0,
        category: 'ai-analysis',
        source: 'ai',
      }];
    }
  }
}

module.exports = { AIAnalyzer };
