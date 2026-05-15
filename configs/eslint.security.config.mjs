// =============================================================================
// إعدادات ESLint مع plugin الأمن
// ضع هذا الملف في جذر المستودع باسم: eslint.config.mjs
// أو ادمج المحتوى مع إعدادات ESLint القائمة
// =============================================================================

import securityPlugin from 'eslint-plugin-security';
import noSecretsPlugin from 'eslint-plugin-no-secrets';

export default [
  // ===== الإعدادات الموصى بها لـ Security Plugin =====
  securityPlugin.configs.recommended,

  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],

    plugins: {
      security: securityPlugin,
      'no-secrets': noSecretsPlugin,
    },

    rules: {
      // ===== قواعد plugin الأمن الأساسية =====
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-bidi-characters': 'error',

      // ===== كشف الأسرار داخل الكود =====
      'no-secrets/no-secrets': [
        'error',
        {
          tolerance: 4.2,
          additionalRegexes: {
            'Anthropic API Key': 'sk-ant-[a-zA-Z0-9_-]{20,}',
            'OpenAI API Key': 'sk-[a-zA-Z0-9]{40,}',
            'Hugging Face Token': 'hf_[a-zA-Z0-9]{30,}',
            'Replicate Token': 'r8_[a-zA-Z0-9]{30,}',
          },
          ignoreContent: [
            'example',
            'placeholder',
            'YOUR_',
            'XXXXXXXXXX',
          ],
        },
      ],

      // ===== قواعد إضافية مهمة أمنياً =====
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-prototype-builtins': 'error',
    },
  },

  // ===== استثناءات للملفات والمسارات =====
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/__fixtures__/**',
    ],
  },
];
