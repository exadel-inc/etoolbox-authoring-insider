/*
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const neostandard = require('neostandard');

module.exports = [
    ...neostandard(),
    {
        files: ['**/*.js'],
        rules: {
            'no-new-func': 'off',
            'no-useless-call': 'off',
            'no-undef': 'off',
            '@stylistic/padded-blocks': 'off'
        },
        languageOptions: {
            ecmaVersion: 2017,
            sourceType: 'module',
            parserOptions: {
                projectService: true
            },
            globals: {
                '$': 'readonly',
                'jQuery': 'readonly',
                'Granite': 'writable',
                'Coral': 'readonly'
            }
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'warn'
        }
    },
    {
        rules: {
            '@stylistic/indent': [
                'error', 4, {
                    'SwitchCase': 1
                }
            ],
            '@stylistic/operator-linebreak': [2, 'after'],
            '@stylistic/semi': [1, 'always'],
            '@stylistic/space-before-function-paren': [
                'error',
                {
                    'anonymous': 'always',
                    'named': 'never',
                    'asyncArrow': 'never'
                }
            ]
        }
    }
];