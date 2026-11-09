module.exports = {
  extends: ['expo'],
  ignorePatterns: ['dist/*'],
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  globals: {
    setInterval: 'readonly',
    clearInterval: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
  },
  rules: {
    'react-hooks/set-state-in-effect': 'off',
  },
};
