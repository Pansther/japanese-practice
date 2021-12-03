module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'airbnb-base',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        './node_modules/coding-standard/eslintDefaults.js',
        './node_modules/coding-standard/.eslintrc-es6',
        './node_modules/coding-standard/.eslintrc-jsx',
        'eslint:all',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    rules: {
        indent: ['error', 4],
        semi: 'off',
        eqeqeq: 'warn',
        strict: 'off',
        '@typescript-eslint/strict-boolean-expressions': [
            2,
            {
                allowString: false,
                allowNumber: false,
            },
        ],
        'linebreak-style': 'off',
    },
}
