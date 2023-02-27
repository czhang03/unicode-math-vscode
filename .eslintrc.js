/* eslint-disable @typescript-eslint/naming-convention */
module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": [
        "prettier",
        'eslint:recommended', 
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
            "project": ['./tsconfig.json'], // Specify it only for TypeScript files
          },
        },
    ],
    "plugins": [
        "@typescript-eslint"
    ],
    "root": true,
    "rules": {
        "@typescript-eslint/member-delimiter-style": [
            "warn",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/naming-convention": "warn",
        "@typescript-eslint/no-unused-expressions": "warn",
        '@typescript-eslint/no-unused-vars': 0,
		'@typescript-eslint/no-explicit-any': 0,
		'@typescript-eslint/explicit-module-boundary-types': 0,
		'@typescript-eslint/no-non-null-assertion': 0,
        "semi": [ "error", "never" ],
        "curly": "warn",
        "eqeqeq": [ "error", "always" ],
        "no-redeclare": "warn",
        "no-throw-literal": "warn",
        "no-unused-expressions": "warn",
    }
}
