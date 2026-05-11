module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint'],
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  globals: {
    cc: 'readonly',
    CocosEngine: 'readonly',
    Editor: 'readonly'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'no-trailing-spaces': 'warn',
    'eol-last': 'warn',
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single', { avoidEscape: true }]
  },
  ignorePatterns: [
    'node_modules/',
    'build/',
    'library/',
    'local/',
    'temp/',
    'native/'
  ]
};
