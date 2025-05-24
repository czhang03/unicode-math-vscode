import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { files: ["src/**/*.ts"] },
  {
    rules: {
      "@typescript-eslint/naming-convention": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/no-non-null-assertion": "error",

      "@typescript-eslint/strict-boolean-expressions": ["error", {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
        allowNullableEnum: false,
      }],

      "@typescript-eslint/no-unused-vars": ["warn", {
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
      }],

      "semi": ["error", "never"],
      "curly": "warn",
      "eqeqeq": ["error", "always"],
      "no-redeclare": "warn",
      "no-throw-literal": "warn",
      "no-unused-expressions": "warn",
    },
  },
  // configuration included in plugin
  jsdoc.configs['flat/recommended'],
  // other configuration objects...
  {
    files: ["src/**/*.ts"],
    plugins: {
      jsdoc,
    },
    rules: {
      "jsdoc/require-param-type": 0,
      "jsdoc/require-property-type": 0,
      "jsdoc/require-returns-type": 0,
    }
  }
);
