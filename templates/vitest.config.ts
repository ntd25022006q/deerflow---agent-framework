/**
 * Deerflow Agent Framework — Vitest Configuration
 *
 * A strict testing configuration with comprehensive coverage thresholds,
 * path alias support, and environment isolation.
 *
 * Usage:
 *   1. Install dependencies: vitest, @vitest/coverage-istanbul, jsdom
 *   2. Import this config in your project's vitest.config.ts
 *   3. Run: npx vitest
 *   4. Coverage: npx vitest run --coverage
 */

import { defineConfig, type UserConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // ---------------------------------------------------------------------------
  // Path Aliases
  // ---------------------------------------------------------------------------
  resolve: {
    alias: {
      // Map @/ to src/ for clean imports: import { foo } from '@/lib/foo'
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },

  // ---------------------------------------------------------------------------
  // Vitest Configuration
  // ---------------------------------------------------------------------------
  test: {
    // ---------------------------------------------------------------------------
    // Environment
    // ---------------------------------------------------------------------------
    // Use jsdom for frontend component testing. For pure backend tests,
    // this can be overridden per file using the @vitest-environment pragma.
    environment: 'jsdom',

    // Setup files run before each test suite
    setupFiles: ['./src/test/setup.ts'],

    // Global setup/teardown for the entire test run
    globalSetup: ['./src/test/global-setup.ts'],

    // ---------------------------------------------------------------------------
    // Test Discovery
    // ---------------------------------------------------------------------------
    // Patterns for test file discovery
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],

    // Directories to exclude from test discovery
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.next',
      'e2e',
      '**/e2e/**',
      '**/*.d.ts',
    ],

    // ---------------------------------------------------------------------------
    // Execution
    // ---------------------------------------------------------------------------
    // Enable global test APIs (describe, it, expect) without imports
    globals: true,

    // Run tests sequentially in CI for stability, in parallel locally
    pool: process.env.CI === 'true' ? 'forks' : 'threads',
    poolOptions: {
      forks: {
        maxForks: process.env.CI === 'true' ? 1 : undefined,
      },
      threads: {
        maxThreads: process.env.CI === 'true' ? 1 : undefined,
      },
    },

    // ---------------------------------------------------------------------------
    // Coverage (Istanbul)
    // ---------------------------------------------------------------------------
    coverage: {
      // Use Istanbul for coverage — supports branch and function coverage
      provider: 'istanbul',

      // Reporter output formats
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],

      // Coverage output directory
      reportsDirectory: './coverage',

      // Files to include in coverage
      include: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.config.*',
        '!src/**/index.ts',
        '!src/**/types/**',
      ],

      // Files to exclude from coverage
      exclude: [
        'node_modules',
        'dist',
        'build',
        'coverage',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/tests/**',
        '**/__mocks__/**',
        '**/types/**',
        'src/test/**',
        'src/**/index.ts',
        '**/*.stories.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.test.{ts,tsx}',
      ],

      // -------------------------------------------------------------------------
      // Coverage Thresholds — STRICT
      // -------------------------------------------------------------------------
      // All thresholds must be met for CI to pass.
      // These values represent the MINIMUM acceptable coverage.
      thresholds: {
        // Statement coverage: every line of code must be tested
        statements: {
          min: 80,
          perFile: true,
        },

        // Branch coverage: all if/else, switch, ternary branches
        branches: {
          min: 80,
          perFile: true,
        },

        // Function coverage: all exported and internal functions
        functions: {
          min: 80,
          perFile: true,
        },

        // Line coverage: all executable lines
        lines: {
          min: 80,
          perFile: true,
        },
      },

      // -------------------------------------------------------------------------
      // Coverage Processing
      // -------------------------------------------------------------------------
      // Treat all uncovered code as a warning in development
      // and as an error in CI
      reportOnFailure: true,

      // Clean coverage directory before each run
      cleanOnRerun: true,

      // Include all files (even those not imported by any test)
      all: true,

      // Custom Istanbul instrumentation settings
      istanbul: {
        // Extensions to instrument
        extension: ['.ts', '.tsx'],

        // Exclude patterns for instrumentation
        exclude: [
          'node_modules/**',
          'coverage/**',
          '**/*.d.ts',
          '**/*.config.*',
          'src/test/**',
          '**/__mocks__/**',
        ],

        // Include comments in coverage reports for better debugging
        includeUntitledFiles: true,

        // Compact the output
        compact: false,

        // Preserve comments for source context
        preserveComments: true,
      },
    },

    // ---------------------------------------------------------------------------
    // Timeouts
    // ---------------------------------------------------------------------------
    // Default test timeout (ms)
    testTimeout: 10_000,

    // Hook timeout (ms)
    hookTimeout: 10_000,

    // ---------------------------------------------------------------------------
    // Reporting
    // ---------------------------------------------------------------------------
    // Reporter configuration
    reporters: process.env.CI === 'true'
      ? ['default', 'json', 'github-actions']
      : ['default', 'verbose'],

    // Output file for json reporter
    outputFile: {
      json: './coverage/vitest-results.json',
    },

    // ---------------------------------------------------------------------------
    // Type Checking
    // ---------------------------------------------------------------------------
    // Run TypeScript type checking during tests
    typecheck: {
      enabled: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['node_modules', 'dist', '**/*.d.ts'],
      tsconfig: './tsconfig.json',
    },

    // ---------------------------------------------------------------------------
    // Isolation
    // ---------------------------------------------------------------------------
    // Reset mocks and state between tests
    // false = shared environment (faster), true = isolated (safer)
    isolate: true,
  },
} satisfies UserConfig);
