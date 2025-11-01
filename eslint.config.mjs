import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Extract rules from jsx-a11y recommended, downgraded to "warn" so they surface
// in the editor but don't block the build while existing violations are fixed
const a11yRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([key, value]) => [
    key,
    Array.isArray(value) ? ["warn", ...value.slice(1)] : value === "error" ? "warn" : value,
  ])
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Override default ignores of eslint-config-next.
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated type files
      "src/types/database.ts",
    ],
  },
  {
    // Plugin for auto-fixing unused imports
    plugins: {
      "unused-imports": unusedImports,
    },
    // Project-specific rule overrides
    rules: {
      // Accessibility rules from jsx-a11y recommended
      ...a11yRules,
      // Allow setState in effects for hydration patterns
      "react-hooks/set-state-in-effect": "off",
      // Allow accessing variables before declaration (hoisting)
      "react-hooks/immutability": "off",
      // Allow creating components during render (for conditional rendering patterns)
      "react-hooks/static-components": "off",
      // Disable the built-in unused vars rule and use the plugin for auto-fixable imports
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Allow explicit any in complex type scenarios
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unescaped entities in JSX (quotes and apostrophes are readable)
      "react/no-unescaped-entities": "off",
      // Allow refs access during render for read-only patterns
      "react-hooks/refs": "off",
      // React Compiler rules - too strict for legitimate patterns like Date.now()
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
