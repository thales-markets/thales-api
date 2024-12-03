import pluginJs from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    env: {
      jest: true,
    },
    languageOptions: { sourceType: "commonjs" },
    rules: {
      "prefer-const": "error",
      "no-invalid-this": "error",
      "no-return-assign": "error",
      "no-unused-expressions": ["error", { allowTernary: true }],
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "no-constant-condition": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "req|res|next|__" }],
      "no-var": "error",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        gameFinishersMap: "writable",
        userReffererIDsMap: "writable",
        solanaAddressesMap: "writable",
      },
    },
  },
  pluginJs.configs.recommended,
];
