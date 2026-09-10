module.exports = {
  root: true,
  ignorePatterns: ["dist/**", "node_modules/**", "*.js"],
  overrides: [
    {
      files: ["src/**/*.ts", "src/**/*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      parserOptions: {
        ecmaVersion: 2019,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      env: { browser: true, node: true, es2019: true },
      rules: {
        "indent": ["error", 2, { SwitchCase: 1 }],
        "no-empty": ["error", { allowEmptyCatch: true }],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
      }
    }
  ]
};
