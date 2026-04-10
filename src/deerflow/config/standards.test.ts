/**
 * Tests for standards.ts - Verifying all exported configuration constants
 * NO MOCK DATA - All tests verify actual exported values from the real source file.
 */

import { describe, it, expect } from 'vitest';
import {
  TypeScriptStandards,
  ComplexityLimits,
  NamingConventions,
  CoverageThresholds,
  TestRequirements,
  TestAntiPatterns,
  OWASPMapping,
  SecurityRules,
  BuildStandards,
  PerformanceBudgets,
  WorkflowLimits,
  ContextLimits,
} from './standards';

describe('Standards Configuration', () => {
  describe('TypeScriptStandards', () => {
    it('has strict mode enabled', () => {
      expect(TypeScriptStandards.strict).toBe(true);
    });

    it('enforces strictNullChecks', () => {
      expect(TypeScriptStandards.strictNullChecks).toBe(true);
    });

    it('enforces noImplicitAny', () => {
      expect(TypeScriptStandards.noImplicitAny).toBe(true);
    });

    it('enforces strictFunctionTypes', () => {
      expect(TypeScriptStandards.strictFunctionTypes).toBe(true);
    });

    it('enforces noUncheckedIndexedAccess', () => {
      expect(TypeScriptStandards.noUncheckedIndexedAccess).toBe(true);
    });

    it('disallows unused locals and parameters', () => {
      expect(TypeScriptStandards.noUnusedLocals).toBe(true);
      expect(TypeScriptStandards.noUnusedParameters).toBe(true);
    });

    it('disallows unreachable code and unused labels', () => {
      expect(TypeScriptStandards.allowUnreachableCode).toBe(false);
      expect(TypeScriptStandards.allowUnusedLabels).toBe(false);
    });

    it('enforces strictBindCallApply', () => {
      expect(TypeScriptStandards.strictBindCallApply).toBe(true);
    });

    it('enforces strictPropertyInitialization', () => {
      expect(TypeScriptStandards.strictPropertyInitialization).toBe(true);
    });

    it('enforces noImplicitReturns and noFallthroughCasesInSwitch', () => {
      expect(TypeScriptStandards.noImplicitReturns).toBe(true);
      expect(TypeScriptStandards.noFallthroughCasesInSwitch).toBe(true);
    });

    it('has at least 15 strictness rules', () => {
      const keys = Object.keys(TypeScriptStandards);
      expect(keys.length).toBeGreaterThanOrEqual(15);
    });

    it('has all core strict flags set to true', () => {
      const coreFlags = ['strict', 'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes'];
      for (const flag of coreFlags) {
        expect((TypeScriptStandards as Record<string, unknown>)[flag]).toBe(true);
      }
    });
  });

  describe('ComplexityLimits', () => {
    it('limits function lines to 50', () => {
      expect(ComplexityLimits.maxFunctionLines).toBe(50);
    });

    it('limits file lines to 300', () => {
      expect(ComplexityLimits.maxFileLines).toBe(300);
    });

    it('limits nesting depth to 4', () => {
      expect(ComplexityLimits.maxNestingDepth).toBe(4);
    });

    it('limits cyclomatic complexity to 15', () => {
      expect(ComplexityLimits.maxCyclomaticComplexity).toBe(15);
    });

    it('limits function parameters to 5', () => {
      expect(ComplexityLimits.maxFunctionParameters).toBe(5);
    });

    it('limits cognitive complexity to 20', () => {
      expect(ComplexityLimits.maxCognitiveComplexity).toBe(20);
    });

    it('limits switch cases to 10', () => {
      expect(ComplexityLimits.maxSwitchCases).toBe(10);
    });

    it('has at least 7 complexity rules', () => {
      expect(Object.keys(ComplexityLimits).length).toBeGreaterThanOrEqual(7);
    });

    it('all limits are positive numbers', () => {
      for (const val of Object.values(ComplexityLimits)) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThan(0);
      }
    });
  });

  describe('NamingConventions', () => {
    it('has camelCase rule for variables and functions', () => {
      expect(NamingConventions.camelCase.pattern).toBeInstanceOf(RegExp);
      expect(NamingConventions.camelCase.appliesTo).toContain('variables');
      expect(NamingConventions.camelCase.appliesTo).toContain('functions');
    });

    it('has PascalCase rule for classes and interfaces', () => {
      expect(NamingConventions.PascalCase.pattern).toBeInstanceOf(RegExp);
      expect(NamingConventions.PascalCase.appliesTo).toContain('classes');
      expect(NamingConventions.PascalCase.appliesTo).toContain('interfaces');
      expect(NamingConventions.PascalCase.appliesTo).toContain('types');
    });

    it('has UPPER_SNAKE_CASE rule for constants', () => {
      expect(NamingConventions.UPPER_SNAKE_CASE.pattern).toBeInstanceOf(RegExp);
      expect(NamingConventions.UPPER_SNAKE_CASE.appliesTo).toContain('constants');
    });

    it('has kebabCase rule for file names and CSS classes', () => {
      expect(NamingConventions.kebabCase.pattern).toBeInstanceOf(RegExp);
      expect(NamingConventions.kebabCase.appliesTo).toContain('file names');
      expect(NamingConventions.kebabCase.appliesTo).toContain('css classes');
    });

    it('has 4 naming convention entries', () => {
      expect(Object.keys(NamingConventions).length).toBe(4);
    });

    it('camelCase regex matches valid identifiers', () => {
      expect(NamingConventions.camelCase.pattern.test('myVariable')).toBe(true);
      expect(NamingConventions.camelCase.pattern.test('MyClass')).toBe(false);
      expect(NamingConventions.camelCase.pattern.test('')).toBe(false);
    });

    it('PascalCase regex matches valid identifiers', () => {
      expect(NamingConventions.PascalCase.pattern.test('MyClass')).toBe(true);
      expect(NamingConventions.PascalCase.pattern.test('myVariable')).toBe(false);
    });

    it('UPPER_SNAKE_CASE regex matches valid identifiers', () => {
      expect(NamingConventions.UPPER_SNAKE_CASE.pattern.test('MAX_SIZE')).toBe(true);
      expect(NamingConventions.UPPER_SNAKE_CASE.pattern.test('myVar')).toBe(false);
    });

    it('kebabCase regex matches valid identifiers', () => {
      expect(NamingConventions.kebabCase.pattern.test('my-file-name')).toBe(true);
      expect(NamingConventions.kebabCase.pattern.test('my_file_name')).toBe(false);
    });
  });

  describe('CoverageThresholds', () => {
    it('requires 80% statement coverage', () => {
      expect(CoverageThresholds.statements).toBe(80);
    });

    it('requires 80% branch coverage', () => {
      expect(CoverageThresholds.branches).toBe(80);
    });

    it('requires 80% function coverage', () => {
      expect(CoverageThresholds.functions).toBe(80);
    });

    it('requires 80% line coverage', () => {
      expect(CoverageThresholds.lines).toBe(80);
    });

    it('all thresholds are equal', () => {
      const vals = Object.values(CoverageThresholds);
      expect(new Set(vals).size).toBe(1);
    });
  });

  describe('TestRequirements', () => {
    it('requires unit tests for utilities', () => {
      expect(TestRequirements.utility).toContain('unit');
    });

    it('requires unit + integration for services', () => {
      expect(TestRequirements.service).toEqual(['unit', 'integration']);
    });

    it('requires integration + security for API routes', () => {
      expect(TestRequirements.apiRoute).toContain('integration');
      expect(TestRequirements.apiRoute).toContain('security');
    });

    it('requires e2e for critical flows', () => {
      expect(TestRequirements.criticalFlow).toContain('e2e');
    });

    it('has requirements for at least 7 component types', () => {
      expect(Object.keys(TestRequirements).length).toBeGreaterThanOrEqual(7);
    });

    it('all requirement arrays are non-empty', () => {
      for (const val of Object.values(TestRequirements)) {
        expect(val.length).toBeGreaterThan(0);
      }
    });
  });

  describe('TestAntiPatterns', () => {
    it('has at least 4 anti-patterns defined', () => {
      expect(TestAntiPatterns.length).toBeGreaterThanOrEqual(4);
    });

    it('each anti-pattern has name, pattern, description, and severity', () => {
      for (const ap of TestAntiPatterns) {
        expect(ap.name).toBeTruthy();
        expect(ap.pattern).toBeInstanceOf(RegExp);
        expect(ap.description).toBeTruthy();
        expect(['ERROR', 'WARNING']).toContain(ap.severity);
      }
    });

    it('detects assertionless tests', () => {
      const ap = TestAntiPatterns.find((a) => a.name === 'Assertionless test');
      expect(ap).toBeDefined();
      expect(ap!.pattern.test('test("foo", () => { })')).toBe(true);
    });

    it('detects trivial assertions', () => {
      const ap = TestAntiPatterns.find((a) => a.name === 'Trivial assertion');
      expect(ap).toBeDefined();
      expect(ap!.pattern.test('expect(true)')).toBe(true);
      expect(ap!.pattern.test('expect(1)')).toBe(true);
    });

    it('detects disabled tests', () => {
      const ap = TestAntiPatterns.find((a) => a.name === 'Disabled test');
      expect(ap).toBeDefined();
      expect(ap!.pattern.test('it.skip("should work", ...)')).toBe(true);
    });

    it('detects empty test bodies', () => {
      const ap = TestAntiPatterns.find((a) => a.name === 'Empty test body');
      expect(ap).toBeDefined();
      expect(ap!.pattern.test('test("foo", () {})')).toBe(true);
    });

    it('has correct severity distribution', () => {
      const errors = TestAntiPatterns.filter((a) => a.severity === 'ERROR').length;
      const warnings = TestAntiPatterns.filter((a) => a.severity === 'WARNING').length;
      expect(errors).toBeGreaterThanOrEqual(2);
      expect(warnings).toBeGreaterThanOrEqual(1);
    });
  });

  describe('OWASPMapping', () => {
    it('maps all 10 OWASP Top 10 categories', () => {
      expect(Object.keys(OWASPMapping).length).toBe(10);
    });

    it('has A01 Broken Access Control', () => {
      expect(OWASPMapping.A01_BROKEN_ACCESS_CONTROL).toContain('authorization-check');
    });

    it('has A03 Injection checks', () => {
      expect(OWASPMapping.A03_INJECTION).toContain('sql-injection-prevention');
      expect(OWASPMapping.A03_INJECTION).toContain('xss-prevention');
    });

    it('has A05 Security Misconfiguration', () => {
      expect(OWASPMapping.A05_SECURITY_MISCONFIGURATION).toContain('header-security');
    });

    it('has A06 Vulnerable Components', () => {
      expect(OWASPMapping.A06_VULNERABLE_COMPONENTS).toContain('dependency-audit');
    });

    it('has A10 SSRF checks', () => {
      expect(OWASPMapping.A10_SSRF).toContain('url-validation');
    });

    it('each category has at least 2 checks', () => {
      for (const checks of Object.values(OWASPMapping)) {
        expect(checks.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('SecurityRules', () => {
    it('has secret detection patterns', () => {
      expect(SecurityRules.secrets.patterns.length).toBeGreaterThanOrEqual(5);
    });

    it('secret severity is CRITICAL', () => {
      expect(SecurityRules.secrets.severity).toBe('CRITICAL');
    });

    it('detects API key patterns', () => {
      const patterns = SecurityRules.secrets.patterns.map((p) => p.source);
      const apiKeyPattern = patterns.find((p) => p.includes('api[_-]?key'));
      expect(apiKeyPattern).toBeDefined();
    });

    it('detects AWS key patterns (AKIA...)', () => {
      const awsPattern = SecurityRules.secrets.patterns.find((p) => p.source.includes('AKIA'));
      expect(awsPattern).toBeDefined();
      expect(awsPattern!.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    });

    it('detects GitHub token patterns (ghp_)', () => {
      const ghPattern = SecurityRules.secrets.patterns.find((p) => p.source.includes('ghp_'));
      expect(ghPattern).toBeDefined();
    });

    it('has dangerous function detection', () => {
      expect(SecurityRules.dangerousFunctions.patterns.length).toBeGreaterThanOrEqual(5);
    });

    it('dangerous functions severity is HIGH', () => {
      expect(SecurityRules.dangerousFunctions.severity).toBe('HIGH');
    });

    it('detects eval() usage', () => {
      const evalPattern = SecurityRules.dangerousFunctions.patterns.find((p) => p.source.includes('eval'));
      expect(evalPattern).toBeDefined();
      expect(evalPattern!.test('eval("code")')).toBe(true);
    });

    it('detects innerHTML assignment', () => {
      const innerHTMLPattern = SecurityRules.dangerousFunctions.patterns.find((p) => p.source.includes('innerHTML'));
      expect(innerHTMLPattern).toBeDefined();
    });

    it('detects dangerouslySetInnerHTML', () => {
      const pattern = SecurityRules.dangerousFunctions.patterns.find((p) => p.source.includes('dangerouslySetInnerHTML'));
      expect(pattern).toBeDefined();
    });
  });

  describe('BuildStandards', () => {
    it('requires minimum build size of 100KB', () => {
      expect(BuildStandards.minimumSizeKB).toBe(100);
    });

    it('requires minimum 10 files', () => {
      expect(BuildStandards.minimumFileCount).toBe(10);
    });

    it('limits bundle size to 10MB', () => {
      expect(BuildStandards.maximumBundleSizeMB).toBe(10);
    });

    it('warns at 5MB bundle size', () => {
      expect(BuildStandards.warningBundleSizeMB).toBe(5);
    });

    it('requires JS, CSS, and HTML assets', () => {
      expect(BuildStandards.mustIncludeAssetTypes).toContain('.js');
      expect(BuildStandards.mustIncludeAssetTypes).toContain('.css');
      expect(BuildStandards.mustIncludeAssetTypes).toContain('.html');
    });

    it('must run independently', () => {
      expect(BuildStandards.mustRunIndependently).toBe(true);
    });

    it('has recommended asset types including images', () => {
      expect(BuildStandards.recommendedAssetTypes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PerformanceBudgets', () => {
    it('FCP budget is 1800ms or less', () => {
      expect(PerformanceBudgets.firstContentfulPaint).toBeLessThanOrEqual(1800);
    });

    it('LCP budget is 2500ms or less', () => {
      expect(PerformanceBudgets.largestContentfulPaint).toBeLessThanOrEqual(2500);
    });

    it('CLS budget is 0.1 or less', () => {
      expect(PerformanceBudgets.cumulativeLayoutShift).toBeLessThanOrEqual(0.1);
    });

    it('FID budget is 100ms or less', () => {
      expect(PerformanceBudgets.firstInputDelay).toBeLessThanOrEqual(100);
    });

    it('TTI budget is 3800ms or less', () => {
      expect(PerformanceBudgets.timeToInteractive).toBeLessThanOrEqual(3800);
    });

    it('TBT budget is 300ms or less', () => {
      expect(PerformanceBudgets.totalBlockingTime).toBeLessThanOrEqual(300);
    });

    it('has 6 performance metrics defined', () => {
      expect(Object.keys(PerformanceBudgets).length).toBe(6);
    });

    it('all budgets are positive numbers', () => {
      for (const val of Object.values(PerformanceBudgets)) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThan(0);
      }
    });
  });

  describe('WorkflowLimits', () => {
    it('limits fix iterations to 5', () => {
      expect(WorkflowLimits.maxFixIterations).toBe(5);
    });

    it('limits refinement iterations to 30', () => {
      expect(WorkflowLimits.maxRefinementIterations).toBe(30);
    });

    it('limits retry attempts to 3', () => {
      expect(WorkflowLimits.maxRetryAttempts).toBe(3);
    });

    it('max research depth is EXHAUSTIVE', () => {
      expect(WorkflowLimits.maxResearchDepth).toBe('EXHAUSTIVE');
    });

    it('limits files per task to 50', () => {
      expect(WorkflowLimits.maxFilesPerTask).toBe(50);
    });

    it('limits concurrent operations to 5', () => {
      expect(WorkflowLimits.maxConcurrentOperations).toBe(5);
    });
  });

  describe('ContextLimits', () => {
    it('max session entries is 10000', () => {
      expect(ContextLimits.maxSessionEntries).toBe(10000);
    });

    it('max worklog size is 50000', () => {
      expect(ContextLimits.maxWorklogSize).toBe(50000);
    });

    it('context refresh interval is 20', () => {
      expect(ContextLimits.contextRefreshInterval).toBe(20);
    });

    it('important entries retained for 30 days', () => {
      expect(ContextLimits.importantEntryRetentionDays).toBe(30);
    });

    it('low importance entries retained for 7 days', () => {
      expect(ContextLimits.lowImportanceRetentionDays).toBe(7);
    });

    it('important retention is longer than low importance', () => {
      expect(ContextLimits.importantEntryRetentionDays).toBeGreaterThan(
        ContextLimits.lowImportanceRetentionDays,
      );
    });
  });
});
