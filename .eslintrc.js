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
        "@typescript-eslint",
        "jsdoc"
    ],
    "root": true,
    "rules": {
        "@typescript-eslint/member-delimiter-style": [
            "warn",
            {
                "multiline": {
                    "delimiter": "none",
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/naming-convention": "warn",
        "@typescript-eslint/no-unused-expressions": "warn",
		'@typescript-eslint/no-explicit-any': "error",
		'@typescript-eslint/explicit-module-boundary-types': 0,
		'@typescript-eslint/no-non-null-assertion': "error",
        "semi": [ "error", "never" ],
        "curly": "warn",
        "eqeqeq": [ "error", "always" ],
        "no-redeclare": "warn",
        "no-throw-literal": "warn",
        "no-unused-expressions": "warn",

        // jsdoc 
        "jsdoc/check-access": 1,  
        "jsdoc/check-alignment": 1,  
        "jsdoc/check-param-names": 1,  
        "jsdoc/check-property-names": 1,  
        "jsdoc/check-tag-names": 1,  
        "jsdoc/check-values": 1,  
        "jsdoc/empty-tags": 1,  
        "jsdoc/implements-on-classes": 1,  
        "jsdoc/multiline-blocks": 1,  
        "jsdoc/newline-after-description": 1,  
        "jsdoc/no-multi-asterisks": 1,  
        "jsdoc/require-jsdoc": 1,  
        "jsdoc/require-param": 1,  
        "jsdoc/require-param-description": 1,  
        "jsdoc/require-param-name": 1,  
        "jsdoc/require-property": 1,  
        "jsdoc/require-property-description": 1,  
        "jsdoc/require-property-name": 1,  
        "jsdoc/require-returns": 1,  
        "jsdoc/require-returns-check": 1,  
        "jsdoc/require-returns-description": 1,  
        "jsdoc/require-yields": 1,  
        "jsdoc/require-yields-check": 1,  
        "jsdoc/tag-lines": 1,  
    }
}
