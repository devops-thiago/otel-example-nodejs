const {
    defineConfig,
} = require("eslint/config");

const globals = require("globals");
const jest = require("eslint-plugin-jest");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.jest,
        },

        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {},
    },

    extends: compat.extends("eslint:recommended", "prettier"),

    plugins: {
        jest,
    },

    rules: {
        "no-console": "off",

        "no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
        }],

        "prefer-const": "error",
        "no-var": "error",
    },
}]);