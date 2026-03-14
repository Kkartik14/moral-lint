# Moral-Lint

[![npm version](https://img.shields.io/npm/v/moral-lint.svg)](https://www.npmjs.com/package/moral-lint)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-56%20passing-brightgreen.svg)]()

An AI-augmented static analysis framework that evaluates JavaScript/TypeScript code for **semantic consistency**, **intent-behavior alignment**, and **ethical compliance**.

Unlike traditional linters that check syntax and style, Moral-Lint detects when code *behavior* doesn't match its *intent* — misleading function names, hidden side effects, consent bypass, dark patterns, and privacy violations.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Configuration](#configuration)
- [Rules](#rules)
- [AI-Assisted Analysis](#ai-assisted-analysis)
- [Scoring System](#scoring-system)
- [API Usage](#api-usage)
- [Test Fixtures](#test-fixtures)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Intent-Behavior Mismatch Detection** — Flags functions whose names suggest one behavior but whose implementations do something different (e.g., `fetchData()` that never makes a network call)
- **Consent Bypass Detection** — Identifies sensitive operations (geolocation, camera, payments) performed without user consent checks
- **Dark Pattern Detection** — Catches forced continuity, hidden unsubscribe buttons, pre-selected add-ons, fake urgency timers, confusing double-negatives, and privacy-hostile defaults
- **Privacy Violation Detection** — Detects credential logging, tracking without consent, browser fingerprinting, excessive data collection, and PII exposure
- **Deceptive Abstraction Detection** — Flags innocuously-named functions that hide concerning behavior like tracking, data harvesting, or redirects
- **Shadowed Behavior Detection** — Finds hidden side effects in functions whose names suggest pure/simple operations
- **AI-Powered Analysis** — Optional LLM integration via OpenRouter for deeper semantic understanding and human-readable explanations
- **Configurable Rule Engine** — Enable/disable rules, set severity levels, add custom configurations
- **Trust Scoring** — Project-level and file-level metrics including Trust Score, Honesty Score, and Ethics Risk Index
- **Beautiful CLI Output** — Color-coded terminal reports with severity icons, score bars, and grades
- **JSON Reports** — Machine-readable output for CI/CD pipeline integration
- **Modular Architecture** — Parser, Analyzer, Rules, AI, Scoring, and Reporter modules are independent and extensible

## Installation

### Global Installation

```bash
npm install -g moral-lint
```

### Local Installation (recommended)

```bash
npm install --save-dev moral-lint
```

### From Source

```bash
git clone https://github.com/your-username/moral-lint.git
cd moral-lint
npm install
```

## Quick Start

### Analyze a file

```bash
npx moral-lint analyze ./src/app.js
```

### Analyze a directory

```bash
npx moral-lint analyze ./src
```

### Analyze current directory

```bash
npx moral-lint
```

### Generate JSON report

```bash
npx moral-lint analyze ./src --format json -o report.json
```

### Analyze without AI (faster, no API key needed)

```bash
npx moral-lint analyze ./src --no-ai
```

## CLI Usage

```
Usage: moral-lint [command] [options]

Commands:
  analyze [target]    Analyze a file or directory for semantic and ethical issues
  report [target]     Generate a detailed JSON report

Options:
  -V, --version            Output version number
  -h, --help               Display help

Analyze Options:
  -f, --format <format>    Output format: cli, json (default: "cli")
  -c, --config <path>      Path to config file
  --no-ai                  Disable AI-assisted analysis
  --severity <level>       Minimum severity: info, warning, error (default: "info")
  -o, --output <path>      Write JSON report to file
```

### Examples

```bash
# Analyze with only warnings and errors
npx moral-lint analyze ./src --severity warning

# Analyze a single TypeScript file
npx moral-lint analyze ./src/payment.ts

# Generate report and save to file
npx moral-lint report ./src -o moral-lint-report.json

# Use custom config
npx moral-lint analyze ./src -c ./my-config.js
```

## Configuration

Create a `.morallint.config.js` file in your project root:

```javascript
module.exports = {
  // Minimum severity to report: 'info', 'warning', 'error'
  severity: 'info',

  // File patterns to ignore (in addition to defaults)
  ignore: [
    '**/test/**',
    '**/__tests__/**',
    '**/*.test.js',
    '**/*.spec.js',
  ],

  // Rule configuration
  rules: {
    'misleading-name': true,           // enabled
    'consent-bypass': true,            // enabled
    'dark-pattern': true,              // enabled
    'privacy-violation': true,         // enabled
    'deceptive-abstraction': true,     // enabled
    'shadowed-behavior': true,         // enabled
  },

  // AI settings
  ai: {
    enabled: true,
    model: 'openrouter/hunter-alpha',
    maxFileSize: 5000,
  },
};
```

### Disabling Rules

```javascript
// .morallint.config.js
module.exports = {
  rules: {
    'shadowed-behavior': false,   // disable
    'dark-pattern': 'off',        // also disable
  },
};
```

### Default Ignored Paths

The following paths are always ignored:
- `node_modules/`, `dist/`, `build/`, `coverage/`, `.git/`, `vendor/`
- `*.min.js`, `*.bundle.js`

## Rules

### 1. `intent-behavior-mismatch` (Semantic Analyzer)

Detects when a function's name suggests a behavior that its implementation doesn't deliver.

| Name Keyword | Expected Behavior | Example |
|---|---|---|
| `fetch`, `get`, `load`, `retrieve` | Network call | `fetchUsers()` with no `fetch`/`axios` call |
| `save`, `store`, `persist`, `write` | Persistence (network/file) | `saveProfile()` that only logs |
| `delete`, `remove`, `destroy` | Deletion (network/file/DOM) | `deleteAccount()` that does nothing |
| `validate`, `verify`, `check` | Returns a result | `validateEmail()` with no return |
| `sanitize`, `escape`, `clean` | Returns cleaned data | `sanitizeInput()` with no return |
| `render`, `display`, `show` | DOM manipulation | `renderChart()` with no DOM access |
| `calculate`, `compute`, `sum` | Returns computed value | `calculateTotal()` with no return |
| `format`, `transform`, `convert` | Returns transformed data | `formatDate()` with no return |

**Severity:** Warning

### 2. `consent-bypass`

Detects sensitive operations without user consent verification.

**Detected patterns:**
- Geolocation, camera, microphone, Bluetooth, USB access without confirmation dialog
- Clipboard, cookie, localStorage access without consent
- Payment processing without user confirmation
- Auto-accept patterns (programmatically setting `checked = true`, `consent = true`)

**Severity:** Error (sensitive API), Warning (auto-accept)

### 3. `dark-pattern/*`

Detects common dark pattern implementations:

| Sub-rule | What it catches |
|---|---|
| `forced-continuity` | Auto-renewal without notification mechanism |
| `hidden-unsubscribe` | Cancel/unsubscribe options with `display: none` or `visibility: hidden` |
| `confusing-negation` | Double negatives in opt-out language ("uncheck to not opt-out") |
| `countdown-pressure` | Fake urgency timers that reset |
| `preselected-addons` | Pre-checked paid add-ons at checkout |
| `share-by-default` | Default privacy settings set to public/everyone |

**Severity:** Warning (most), Error (hidden-unsubscribe)

### 4. `privacy-violation/*`

Detects privacy-violating patterns:

| Sub-rule | What it catches |
|---|---|
| `credential-logging` | Passwords, tokens, API keys in console.log |
| `PII-logging` | SSN, credit card, CVV in logs or analytics |
| `PII-tracking` | Email, phone, address in tracking/analytics |
| `tracking` | Analytics/telemetry without consent checks |
| `fingerprinting` | Canvas/WebGL fingerprinting patterns |
| `excessive-collection` | Collecting 2+ categories of device info |

**Severity:** Error (credentials/PII), Warning (tracking/collection)

### 5. `deceptive-abstraction/*`

Flags functions with generic/innocuous names that hide concerning behavior:

- `init()`, `setup()`, `helper()` functions that perform tracking
- `process()`, `handle()` functions that access sensitive APIs
- `subscribe()`, `notify()` functions that harvest data
- Functions that silently redirect users

**Severity:** Warning

### 6. `shadowed-behavior/*`

Detects hidden side effects in pure-looking functions:

- `format*()`, `parse*()`, `validate*()` with network calls
- `calculate*()`, `convert*()`, `sort*()` with file system access
- `render*()`, `display*()` with sensitive API access

**Severity:** Warning

### 7. `empty-named-function`

Flags functions with descriptive names but empty bodies (stubs that were never implemented).

**Severity:** Warning

### 8. `comment-behavior-mismatch`

Detects contradictions between JSDoc/comments and actual behavior:
- Function documented as "pure" but has side effects
- `@returns` tag but no return statement

**Severity:** Warning/Info

### 9. `deceptive-facade`

Flags thin wrapper functions that delegate to a single function with a semantically unrelated name.

**Severity:** Info

## AI-Assisted Analysis

Moral-Lint can optionally use an LLM via [OpenRouter](https://openrouter.ai/) for deeper analysis that goes beyond pattern matching.

### Setup

1. Create a `.env` file in your project root:

```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openrouter/hunter-alpha
```

2. Run analysis (AI is enabled by default when the API key is present):

```bash
npx moral-lint analyze ./src
```

3. To disable AI analysis:

```bash
npx moral-lint analyze ./src --no-ai
```

### What AI Analysis Adds

- **Deeper intent reasoning** — Understands nuanced intent from function names, comments, and code structure
- **Contextual explanations** — Provides human-readable explanations of why something is flagged
- **Pattern recognition** — Catches subtle ethical issues that regex patterns miss
- **Lower false positives** — LLM can distinguish benign patterns from genuine concerns

### AI Issue Categories

AI-detected issues are prefixed with `ai/`:
- `ai/intent-mismatch` — Semantic misalignment detected by LLM
- `ai/ethical-concern` — Ethical issue identified
- `ai/hidden-side-effect` — Non-obvious side effects
- `ai/trust-violation` — Code that could erode user trust

## Scoring System

Moral-Lint produces three key metrics for each file and the project overall:

### Trust Score (0–100)

Overall confidence that the code is trustworthy. Starts at 100 and decreases based on issues found. Ethical issues are weighted 1.5x heavier than semantic issues.

### Honesty Score (0–100)

How well function names, comments, and documentation match actual behavior. Based only on semantic-consistency category issues.

### Ethics Risk Index

Cumulative risk score based on ethical compliance issues. Higher = more ethical concerns.

### Grades

| Score | Grade |
|---|---|
| 95–100 | A+ |
| 90–94 | A |
| 85–89 | A- |
| 80–84 | B+ |
| 75–79 | B |
| 70–74 | B- |
| 65–69 | C+ |
| 60–64 | C |
| 55–59 | C- |
| 50–54 | D |
| 0–49 | F |

## API Usage

Use Moral-Lint programmatically in your Node.js applications:

```javascript
const { MoralLint } = require('moral-lint');

// Initialize with options
const linter = new MoralLint({
  ai: true,           // Enable AI analysis
  severity: 'warning', // Minimum severity
});

// Analyze a single file
const code = `
  function fetchUsers() {
    return [{ name: 'hardcoded' }]; // Doesn't actually fetch!
  }
`;

const result = await linter.analyzeCode(code, 'users.js');

console.log(result.issues);     // Array of issues found
console.log(result.score);       // { trustScore, honestyScore, ethicsRiskIndex, grade }

// Analyze multiple files
const results = await linter.analyzeFiles([
  { code: file1Code, filename: 'auth.js' },
  { code: file2Code, filename: 'payment.js' },
]);

console.log(results.summary);   // Project-level aggregated scores
```

### Individual Module Usage

```javascript
// Parser
const { parse } = require('moral-lint/src/parser');
const ast = parse(code, 'file.js');

// Metadata extraction
const { extractMetadata } = require('moral-lint/src/analyzer/metadata');
const metadata = extractMetadata(ast, code, 'file.js');

// Semantic analysis
const { analyzeSemantics } = require('moral-lint/src/analyzer/semantic');
const issues = analyzeSemantics(metadata, ast, code);

// Rule engine
const { RuleEngine } = require('moral-lint/src/rules');
const engine = new RuleEngine(config);
const ruleIssues = engine.run(ast, metadata, code, 'file.js');

// Scoring
const { ScoreAggregator } = require('moral-lint/src/scoring');
const scorer = new ScoreAggregator();
const score = scorer.scoreFile(issues);
```

## Test Fixtures

The `test/fixtures/` directory contains example files demonstrating each category of issue:

| File | Description |
|---|---|
| `clean-code.js` | Well-written code — should produce minimal issues |
| `misleading-names.js` | Functions with names that don't match behavior |
| `consent-bypass.js` | Sensitive operations without user consent |
| `dark-patterns.js` | Common dark pattern implementations |
| `privacy-violations.js` | Privacy-violating patterns |
| `deceptive-abstractions.js` | Innocuous names hiding concerning behavior |

Run the test suite:

```bash
npm test
```

## Architecture

```
moral-lint/
├── bin/
│   └── moral-lint.js           # CLI entrypoint
├── src/
│   ├── index.js                # Main MoralLint class & analysis pipeline
│   ├── cli.js                  # CLI file discovery & orchestration
│   ├── parser/
│   │   └── index.js            # Babel-based AST parser (JS/TS/JSX)
│   ├── analyzer/
│   │   ├── metadata.js         # AST metadata extractor (functions, imports, etc.)
│   │   └── semantic.js         # Intent-behavior mismatch detector
│   ├── rules/
│   │   ├── index.js            # Rule engine (loads & runs rules)
│   │   ├── misleading-name.js  # Contradictory name-behavior pairs
│   │   ├── consent-bypass.js   # Sensitive ops without consent
│   │   ├── dark-pattern.js     # UI/UX dark patterns in code
│   │   ├── privacy-violation.js # Privacy & data handling issues
│   │   ├── deceptive-abstraction.js  # Hidden behavior behind generic names
│   │   └── shadowed-behavior.js      # Hidden side effects
│   ├── ai/
│   │   └── index.js            # OpenRouter LLM integration
│   ├── reporter/
│   │   ├── index.js            # Reporter factory
│   │   ├── cli-reporter.js     # Terminal output with colors & scores
│   │   └── json-reporter.js    # Machine-readable JSON output
│   └── scoring/
│       └── index.js            # Trust/Honesty/Ethics scoring & grading
├── test/
│   ├── fixtures/               # Example files for each issue category
│   ├── parser.test.js          # Parser tests
│   ├── metadata.test.js        # Metadata extraction tests
│   ├── semantic.test.js        # Semantic analysis tests
│   ├── rules.test.js           # Rule engine tests
│   ├── scoring.test.js         # Scoring tests
│   └── integration.test.js     # End-to-end integration tests
├── .morallint.config.js        # Default configuration
├── .env.example                # Environment variable template
└── package.json
```

### Analysis Pipeline

```
Source Code
    │
    ▼
┌─────────────────┐
│  Babel Parser    │  Parse JS/TS/JSX into AST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Metadata Extract │  Functions, imports, comments, call graph
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Semantic│ │Rule Engine│  Pattern matching + intent analysis
│Analysis│ │(6 rules) │
└───┬────┘ └────┬─────┘
    │           │
    └─────┬─────┘
          ▼
   ┌─────────────┐
   │ AI Analyzer  │  Optional LLM-powered deep analysis
   │ (OpenRouter) │
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   Scoring    │  Trust Score, Honesty Score, Ethics Risk
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  Reporter    │  CLI (colored) or JSON output
   └─────────────┘
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Moral-Lint Check
on: [push, pull_request]

jobs:
  moral-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install
      - run: npx moral-lint analyze ./src --severity warning --no-ai
```

### Pre-commit Hook

Add to `package.json`:

```json
{
  "scripts": {
    "precommit": "moral-lint analyze ./src --severity error --no-ai"
  }
}
```

Or with [Husky](https://typicode.github.io/husky/):

```bash
npx husky add .husky/pre-commit "npx moral-lint analyze ./src --severity error --no-ai"
```

## Supported File Types

- `.js` — JavaScript
- `.jsx` — React JSX
- `.ts` — TypeScript
- `.tsx` — TypeScript JSX
- `.mjs` — ES Modules
- `.cjs` — CommonJS

## System Requirements

- **Node.js:** v16 or higher
- **npm:** v7 or higher
- **Optional:** OpenRouter API key for AI-assisted analysis

## Publishing to npm

### Manual Publish

```bash
npm login
npm publish --access public
```

### Auto-Publish on Push (GitHub Actions)

This repo includes a GitHub Actions workflow (`.github/workflows/publish.yml`) that automatically publishes to npm when you push to `main`.

**One-time setup:**

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: Your npm access token (get one at https://www.npmjs.com/settings/YOUR_USERNAME/tokens — create a **Granular Access Token** with **Read and Write** permissions)
5. Click **Add secret**

Now every push to `main` will:
1. Run the full test suite
2. If tests pass, publish the new version to npm

**To release a new version:**

```bash
# Bump version (patch/minor/major)
npm version patch    # 1.0.0 → 1.0.1
npm version minor    # 1.0.0 → 1.1.0
npm version major    # 1.0.0 → 2.0.0

# Push with tags
git push && git push --tags
```

The workflow handles the rest.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-rule`
3. Write tests for your changes
4. Run the test suite: `npm test`
5. Submit a pull request

### Adding Custom Rules

Create a new rule file in `src/rules/`:

```javascript
const myRule = {
  id: 'my-custom-rule',
  description: 'What this rule detects',
  severity: 'warning',           // 'info', 'warning', or 'error'
  category: 'ethical-compliance', // or 'semantic-consistency'
  enabled: true,

  check(ast, metadata, code, filename) {
    const issues = [];
    // Your detection logic here
    // Push issues to the array
    return issues;
  },
};

module.exports = { myRule };
```

Then register it in `src/rules/index.js`.

## Authors

- **Kartik Gupta** — SAP ID: 500107771
- **Priyanshi Rai** — SAP ID: 500108262
- **Jyotiraditya Singh** — SAP ID: 500107065

**Supervisor:** Dr. Tanupriya Choudhury

B.Tech Computer Science and Engineering, UPES Dehradun

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
