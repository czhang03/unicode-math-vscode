/* eslint-disable @typescript-eslint/naming-convention */
module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": [
        "prettier",
        'eslint:recommended', 
        "plugin:jsdoc/recommended-error"
    ],
    "parser": "@typescript-eslint/parser",
    "overrides": [
        // only parse with typescript on typescript files
        {
          "files": ['*.ts', '*.tsx'], // Your TypeScript files extension
    
          "extends": [
            'plugin:@typescript-eslint/recommended',
            'plugin:@typescript-eslint/recommended-requiring-type-checking',
          ],
    
          "parserOptions": {
            "project": true,
            "tsconfigRootDir": __dirname,
          },
        },
    ],
    "plugins": [
        "@typescript-eslint",
        "jsdoc"
    ],
    "root": true,
    "rules": {
        "@typescript-eslint/naming-convention": "warn",
        "@typescript-eslint/no-unused-expressions": "warn",
		'@typescript-eslint/no-explicit-any': "error",
		'@typescript-eslint/explicit-module-boundary-types': 0,
		'@typescript-eslint/no-non-null-assertion': "error",
        "@typescript-eslint/strict-boolean-expressions": ["error",{
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
        "semi": [ "error", "never" ],
        "curly": "warn",
        "eqeqeq": [ "error", "always" ],
        "no-redeclare": "warn",
        "no-throw-literal": "warn",
        "no-unused-expressions": "warn",
        "jsdoc/require-param-type": 0,
        "jsdoc/require-property-type": 0,
        "jsdoc/require-returns-type": 0,
    }
}
