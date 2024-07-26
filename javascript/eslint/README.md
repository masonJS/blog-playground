# eslint

### eslint run
```bash
 npx eslint --fix .
```

### install npm 
```
yarn add -D eslint-plugin-node eslint-plugin-import eslint-plugin-jest-formatting eslint-config-async
```

### plugins
```js
// .eslintrc.js
module.exports = {
  plugins: ['@typescript-eslint/eslint-plugin', 'import', 'eslint-plugin-node'],
}
```
#### import
- `eslint-plugin-import` npm 에서 사용되는 plugin
- import 구문의 순서 규칙을 정의
- https://www.npmjs.com/package/eslint-plugin-import

#### eslint-plugin-node
- `eslint-plugin-node` npm 에서 사용되는 plugin
- node.js 에서의 린트 규칙 정의
- https://www.npmjs.com/package/eslint-plugin-node

### extends
```js
// .eslintrc.js
module.exports = {
  extends: [
    // ...,
    'plugin:jest-formatting/recommended',
    'eslint-config-async'
  ]
}
```

##### plugin:jest-formatting/recommended
- `eslint-plugin-jest-formatting` npm 에서 사용되는 extend
- jest 규칙을 사용할 수 있는 '권장' 설정
- https://github.com/dangreenisrael/eslint-plugin-jest-formatting?tab=readme-ov-file 

##### eslint-config-async
- `eslint-config-async` npm 에서 사용되는 extend
- [비동기 코드 관련 린트](https://maximorlov.com/linting-rules-for-asynchronous-code-in-javascript/) 규칙 설정


### rules
```js
// .eslintrc.js
module.exports = {
  rules: {
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/promise-function-async': 'error',
    '@typescript-eslint/member-ordering': [
      'error',
      {
        default: {
          memberTypes: [
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'constructor',
            'public-static-method',
            'protected-static-method',
            'private-static-method',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
            'get',
          ],
        },
      },
    ],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: '*', next: 'block' },
      { blankLine: 'always', prev: '*', next: 'block-like' },
    ],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', ['parent', 'sibling'], 'index'],
        'newlines-between': 'never',
      },
    ],
    'no-console': 'error',
    curly: 1,
    'arrow-body-style': ['error', 'as-needed'],
    eqeqeq: ['error', 'always'],
    'no-else-return': ['error', { allowElseIf: false }],
    'max-nested-callbacks': ['error', 5],
    'no-return-await': 'off',
  }
}
```
