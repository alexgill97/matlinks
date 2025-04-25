export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    // Mocks for CSS and file imports
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    // Path aliases
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(@?react-native.*|react-native))'
  ],
}; 