import js from '@eslint/js';
import typescript from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default [
    // Ignore patterns
    {
        ignores: [
            '.next/**',
            'out/**',
            'node_modules/**',
            'build/**',
            'dist/**',
            '.cache/**',
            'public/**',
            '*.config.js',
            '*.config.mjs',
            'coverage/**',
            'jest.setup.js',
            'scripts/**',
        ],
    },

    // Base JavaScript recommended
    js.configs.recommended,

    // TypeScript configs
    ...typescript.configs.recommended,

    // React and hooks for app files
    {
        files: ['src/**/*.{js,mjs,cjs,jsx,ts,tsx}', 'app/**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'jsx-a11y': jsxA11y,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off', // Not needed in Next.js
            'react/prop-types': 'off', // Using TypeScript
        },
    },

    // Node.js files (middleware, API routes, etc.)
    {
        files: ['middleware.ts', 'src/app/api/**/*.{js,ts}', 'src/lib/**/*.{js,ts}', 'src/utils/**/*.{js,ts}', 'src/workers/**/*.{js,ts}'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
    },

    // Custom rules for all files
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
];
