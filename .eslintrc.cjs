/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "react/no-unescaped-entities",
    "@typescript-eslint/no-unsafe-assignment",
  ],
  rules: {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/non-nullable-type-assertion-style": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unnecessary-type-assertion": "off",
    " @typescript-eslint/no-unsafe-return": "off",
    " @typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
      },
    ],

    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],
  },
};
module.exports = config;
