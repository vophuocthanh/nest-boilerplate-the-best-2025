/**
 * Ranh giới kiến trúc (xem docs/ARCHITECTURE.md):
 *
 *   modules/  ──▶  integrations/  ──▶  config/
 *      │                                  ▲
 *      ├──────▶  core/  ──────────────────┤
 *      └──────▶  shared/  ────────────────┘
 *
 * Quy tắc được enforce ở phần `overrides` bên dưới bằng `no-restricted-imports`
 * (rule lõi của ESLint — không cần thêm plugin hay resolver nào). Điều kiện để
 * nó chặt chẽ: mọi import XUYÊN TẦNG phải dùng alias `@/…`, và điều đó cũng
 * được lint luôn.
 */

/** Chặn một tầng import ngược lên các tầng nằm trên nó. */
const forbidLayers = (layers, reason) => ({
  patterns: layers.flatMap((layer) => [
    { group: [`@/${layer}`, `@/${layer}/**`], message: reason },
    { group: [`**/../${layer}/**`], message: reason },
  ]),
});

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    // Không dùng plugin:prettier/recommended để ESLint không báo lỗi formatting.
    // Prettier vẫn chạy khi format on save qua VS Code.
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', 'coverage/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // `interface User extends AuthenticatedUser {}` trong express.d.ts là cách
    // duy nhất để mở rộng type của Passport -> cho phép trường hợp này.
    '@typescript-eslint/no-empty-interface': [
      'error',
      { allowSingleExtends: true },
    ],

    // Import organization rules
    'sort-imports': [
      'error',
      {
        ignoreCase: false,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        allowSeparatedGroups: true,
      },
    ],
  },
  overrides: [
    {
      // core/ là hạ tầng chạy cho mọi request — không được biết feature nào tồn tại.
      files: ['src/core/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          forbidLayers(
            ['modules'],
            'core/ là hạ tầng dùng chung, không được phụ thuộc modules/.',
          ),
        ],
      },
    },
    {
      // shared/ là tầng thấp nhất: chỉ được dùng thư viện ngoài và chính nó.
      files: ['src/shared/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          forbidLayers(
            ['modules', 'core', 'integrations'],
            'shared/ nằm dưới cùng trong thứ tự phụ thuộc — không import ngược lên.',
          ),
        ],
      },
    },
    {
      // integrations/ là adapter ra hệ thống ngoài (S3, SMTP): chỉ biết config/ và shared/.
      files: ['src/integrations/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          forbidLayers(
            ['modules', 'core'],
            'integrations/ là adapter ra ngoài, không được biết tới modules/ hay core/.',
          ),
        ],
      },
    },
    {
      // Trong modules/: import xuyên tầng hoặc xuyên module phải dùng alias @/,
      // để phụ thuộc nhìn thấy được ngay ở dòng import thay vì ẩn sau '../../..'.
      files: ['src/modules/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../../*'],
                message:
                  "Import xuyên tầng/xuyên module phải dùng alias '@/…' để đường dẫn không phụ thuộc vị trí file.",
              },
            ],
          },
        ],
      },
    },
    {
      // Test được phép mock xuyên tầng thoải mái.
      files: ['**/*.spec.ts', 'test/**/*.ts', 'src/test/**/*.ts'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
};
