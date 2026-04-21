import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";
import jsxA11y from "eslint-plugin-jsx-a11y";

// `eslint-config-next`'s first block registers `jsx-a11y`, `react-hooks`,
// `react`, `import`, and `@next/next` plugins for TS/JS files. ESLint 9 flat
// config scopes plugin registrations per-block — referencing those rule names
// in a new block throws "could not find plugin". So we merge our overrides
// that reference upstream plugins (jsx-a11y/*, react-hooks/*, react/*)
// directly into that upstream block, and keep project-only plugins
// (unused-imports) in their own block.
const nextBaseBlock = nextVitals[0];
const projectRuleOverrides = {
  // Accessibility: upgrade jsx-a11y recommended to the full ruleset (the
  // upstream nextBaseBlock ships only a 6-rule subset at warn level).
  ...jsxA11y.flatConfigs.recommended.rules,
  // Allow setState in effects for hydration patterns
  "react-hooks/set-state-in-effect": "off",
  // Allow accessing variables before declaration (hoisting)
  "react-hooks/immutability": "off",
  // Allow creating components during render (for conditional rendering patterns)
  "react-hooks/static-components": "off",
  // Allow explicit any in complex type scenarios
  "@typescript-eslint/no-explicit-any": "warn",
  // Allow unescaped entities in JSX (quotes and apostrophes are readable)
  "react/no-unescaped-entities": "off",
  // Allow refs access during render for read-only patterns
  "react-hooks/refs": "off",
  // React Compiler rules - too strict for legitimate patterns like Date.now()
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/purity": "warn",
};

const mergedNextBaseBlock = {
  ...nextBaseBlock,
  rules: {
    ...nextBaseBlock.rules,
    ...projectRuleOverrides,
  },
};

const eslintConfig = defineConfig([
  mergedNextBaseBlock,
  ...nextVitals.slice(1),
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
      // Vercel build output (generated bundles)
      ".vercel/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
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
    },
  },
]);

export default eslintConfig;
