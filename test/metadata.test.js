'use strict';

const { parse } = require('../src/parser');
const { extractMetadata } = require('../src/analyzer/metadata');

describe('Metadata Extractor', () => {
  function getMetadata(code, filename = 'test.js') {
    const ast = parse(code, filename);
    return extractMetadata(ast, code, filename);
  }

  test('extracts function declarations', () => {
    const meta = getMetadata(`
      function greet(name) { return 'Hello ' + name; }
      function add(a, b) { return a + b; }
    `);

    expect(meta.functions.length).toBe(2);
    expect(meta.functions[0].name).toBe('greet');
    expect(meta.functions[0].params).toEqual(['name']);
    expect(meta.functions[1].name).toBe('add');
    expect(meta.functions[1].params).toEqual(['a', 'b']);
  });

  test('extracts arrow functions assigned to variables', () => {
    const meta = getMetadata(`
      const multiply = (a, b) => a * b;
      const fetchData = async () => { return await fetch('/api'); };
    `);

    expect(meta.functions.length).toBe(2);
    expect(meta.functions[0].name).toBe('multiply');
    expect(meta.functions[1].name).toBe('fetchData');
    expect(meta.functions[1].isAsync).toBe(true);
  });

  test('detects network calls', () => {
    const meta = getMetadata(`
      async function loadUsers() {
        const res = await fetch('/api/users');
        return res.json();
      }
    `);

    expect(meta.functions[0].hasNetworkCall).toBe(true);
  });

  test('detects DOM access', () => {
    const meta = getMetadata(`
      function showMessage(msg) {
        const el = document.getElementById('message');
        el.innerHTML = msg;
      }
    `);

    expect(meta.functions[0].hasDOMAccess).toBe(true);
  });

  test('detects file system access', () => {
    const meta = getMetadata(`
      function readConfig() {
        return fs.readFileSync('./config.json', 'utf-8');
      }
    `);

    expect(meta.functions[0].hasFileAccess).toBe(true);
  });

  test('detects sensitive API access', () => {
    const meta = getMetadata(`
      function getLocation() {
        navigator.geolocation.getCurrentPosition(cb);
      }
    `);

    expect(meta.functions[0].hasSensitiveAPI).toBe(true);
  });

  test('extracts return statements', () => {
    const meta = getMetadata(`
      function compute(x) {
        if (x > 0) return x * 2;
        return 0;
      }
      function noReturn() { console.log('hi'); }
    `);

    expect(meta.functions[0].returnStatements.length).toBe(2);
    expect(meta.functions[0].returnStatements[0].hasValue).toBe(true);
    expect(meta.functions[1].returnStatements.length).toBe(0);
  });

  test('extracts imports', () => {
    const meta = getMetadata(`
      import fs from 'fs';
      import { join } from 'path';
    `);

    expect(meta.imports.length).toBe(2);
    expect(meta.imports[0].source).toBe('fs');
    expect(meta.imports[1].source).toBe('path');
  });

  test('extracts class methods', () => {
    const meta = getMetadata(`
      class Service {
        constructor() { this.db = null; }
        async find(id) { return this.db.get(id); }
        static create() { return new Service(); }
      }
    `);

    const classMethods = meta.functions.filter((f) => f.type === 'ClassMethod');
    expect(classMethods.length).toBe(3);
    expect(classMethods.map((m) => m.name)).toEqual(['constructor', 'find', 'create']);
  });

  test('extracts callees', () => {
    const meta = getMetadata(`
      function process(data) {
        validate(data);
        const cleaned = sanitize(data);
        return transform(cleaned);
      }
    `);

    expect(meta.functions[0].callees).toContain('validate');
    expect(meta.functions[0].callees).toContain('sanitize');
    expect(meta.functions[0].callees).toContain('transform');
  });

  test('extracts leading comments', () => {
    const meta = getMetadata(`
      // This adds two numbers
      function add(a, b) { return a + b; }
    `);

    expect(meta.functions[0].leadingComments.length).toBeGreaterThan(0);
  });
});
