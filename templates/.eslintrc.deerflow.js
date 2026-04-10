/**
 * Deerflow Agent Framework — Strict ESLint Configuration
 *
 * This is the canonical ESLint config for the Deerflow framework.
 * It enforces maximum code quality, type safety, and consistency.
 *
 * Usage: extend this config in your project's .eslintrc.js
 *   module.exports = require('./templates/.eslintrc.deerflow');
 *
 * Requirements:
 *   - @typescript-eslint/eslint-plugin
 *   - @typescript-eslint/parser
 *   - eslint-config-prettier
 *   - eslint-plugin-import (optional)
 */

'use strict';

module.exports = {
  // ---------------------------------------------------------------------------
  // Base extends — ordered from least to most opinionated
  // ---------------------------------------------------------------------------
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Must be last to disable conflicting rules
    // 'plugin:next/recommended',    // Uncomment when using Next.js
    // 'plugin:react/recommended',    // Uncomment when using React
    // 'plugin:react-hooks/recommended', // Uncomment when using React hooks
  ],

  // ---------------------------------------------------------------------------
  // Parser — TypeScript-first
  // ---------------------------------------------------------------------------
  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },

  // ---------------------------------------------------------------------------
  // Plugins
  // ---------------------------------------------------------------------------
  plugins: [
    '@typescript-eslint',
    // 'import',    // Uncomment for import ordering rules
    // 'react',     // Uncomment for React-specific rules
    // 'react-hooks', // Uncomment for React hooks rules
  ],

  // ---------------------------------------------------------------------------
  // Environments
  // ---------------------------------------------------------------------------
  env: {
    browser: true,
    node: true,
    es2024: true,
    jest: true,
  },

  // ---------------------------------------------------------------------------
  // Global ignores
  // ---------------------------------------------------------------------------
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'build/',
    '.next/',
    'coverage/',
    '*.config.js',
    '*.config.mjs',
    '*.config.ts',
  ],

  // ---------------------------------------------------------------------------
  // Rules — JavaScript best practices
  // ---------------------------------------------------------------------------
  rules: {
    // --- Variable declarations ---
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // --- Console and debugging ---
    'no-console': 'warn',
    'no-debugger': 'error',

    // --- Security: eval is forbidden ---
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // --- Error handling ---
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // --- Equality ---
    'eqeqeq': ['error', 'always', { null: 'ignore' }],

    // --- Ternary expressions ---
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',

    // --- Complexity limits ---
    'max-depth': ['error', { max: 4 }],
    'max-lines-per-function': [
      'warn',
      {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    'max-lines': [
      'warn',
      {
        max: 300,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    complexity: ['error', { max: 15 }],

    // --- Code style ---
    'curly': ['error', 'all'],
    'default-case-last': 'error',
    'dot-notation': 'error',
    'no-param-reassign': 'error',
    'prefer-template': 'error',
    'prefer-object-spread': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    'object-shorthand': 'error',
    'no-else-return': 'error',
    'no-lonely-if': 'error',

    // --- Import discipline ---
    'no-duplicate-imports': 'error',
    'no-cycle': 'warn',

    // --- Best practices ---
    'require-await': 'error',
    'no-return-await': 'error',
    'no-shadow': 'error',
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
  },

  // ---------------------------------------------------------------------------
  // TypeScript-specific rules
  // ---------------------------------------------------------------------------
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // --- Type safety ---
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
            disallowTypeAnnotations: false,
          },
        ],

        // --- Async discipline ---
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/promise-function-async': 'warn',

        // --- Strict boolean handling ---
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          {
            allowString: false,
            allowNumber: false,
            allowNullableObject: true,
            allowNullableBoolean: false,
            allowNullableString: false,
            allowNullableNumber: false,
            allowAny: false,
          },
        ],

        // --- Null safety ---
        '@typescript-eslint/no-non-null-assertion': 'error',

        // --- Consistency ---
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/consistent-type-definitions': 'error',
        '@typescript-eslint/no-duplicate-type-constituents': 'error',
        '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-readonly': 'error',

        // --- Naming ---
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'default',
            format: ['camelCase'],
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          {
            selector: 'enumMember',
            format: ['UPPER_CASE'],
          },
          {
            selector: 'variable',
            modifiers: ['const'],
            types: ['boolean', 'number', 'string', 'object'],
            format: ['camelCase', 'UPPER_CASE'],
          },
          {
            selector: 'memberLike',
            modifiers: ['private'],
            format: ['camelCase'],
            leadingUnderscore: 'require',
          },
          {
            selector: 'memberLike',
            modifiers: ['protected'],
            format: ['camelCase'],
            leadingUnderscore: 'require',
          },
        ],

        // --- Return types ---
        '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
        '@typescript-eslint/no-confusing-void-expression': 'error',
      },
    },
  ],
};
