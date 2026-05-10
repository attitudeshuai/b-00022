import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
    js.configs.recommended,
    {
        files: ['assets/**/*.ts'],
        ignores: [
            'node_modules/**',
            'build/**',
            'library/**',
            'local/**',
            'temp/**',
            'native/**',
            '**/*.d.ts',
        ],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                console: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'no-console': 'off',
            'prefer-const': 'warn',
            'no-var': 'error',
            'eqeqeq': ['warn', 'always'],
            'curly': 'off',
        },
    },
];
