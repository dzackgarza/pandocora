// Minimal ESLint config for TypeScript files in src/
'use strict';

const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: ['**/*.js', '**/node_modules/**', 'out/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
    },
    plugins: {
      '@typescript-eslint': tsPlugin, // Standard name ESLint expects for these rules
    },
    rules: {
      // Start with recommended rules from @typescript-eslint/eslint-plugin
      ...tsPlugin.configs.recommended.rules,
      // 'eslint:recommended' rules (from @eslint/js) can also be added if desired
      // ...require('@eslint/js').configs.recommended.rules,

      // Customizations and additional rules:
      '@typescript-eslint/no-unused-vars': [
        'error', // or 'warn'
        { argsIgnorePattern: '^_' , varsIgnorePattern: '^_' , caughtErrorsIgnorePattern: '^_' }
      ],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'assert'] }], // Warn for console.log, allow others

      // Example: Enforce type checking rules (can be slower, consider for specific configs or CI)
      // "@typescript-eslint/no-explicit-any": "warn",
      // "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  // Configuration for test files specifically, if needed
  // {
  //   files: ['tests/**/*.ts'],
  //   rules: {
  //     // Example: relax or change rules for test files
  //     // For instance, if tests legitimately use 'any' or 'require' more often
  //     '@typescript-eslint/no-explicit-any': 'off',
  //     '@typescript-eslint/no-var-requires': 'off',
  //   }
  // }
];
