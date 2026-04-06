/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parserOptions: {
    project: ['./packages/*/tsconfig.json', './packages/*/tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Enforce explicit return types on exported functions for better API clarity
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    // Prefer unknown over any at boundaries
    '@typescript-eslint/no-explicit-any': 'error',
    // No floating promises — important in async auth workflows
    '@typescript-eslint/no-floating-promises': 'error',
    // Consistent type imports
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    // Disallow unused vars (except _ prefix for intentional ignores)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '*.cjs'],
};
