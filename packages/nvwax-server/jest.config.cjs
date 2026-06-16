/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // 自定义 resolver：把 ESM 的 .js 相对路径映射到 .ts 源文件
  resolver: '<rootDir>/jest.resolver.cjs',
  transform: {
    '^.+\\.m?tsx?$': ['ts-jest', { useESM: true, isolatedModules: true }]
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  // 排除 src/tests/ 下独立的 Node 脚本（.integration.test.ts）以及 ESM 不兼容的旧测试
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$', 'virtual-company-creation\\.service\\.test\\.ts$'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000
};