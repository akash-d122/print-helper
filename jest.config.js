module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia|react-redux|uuid|@react-native-gesture-handler))',
  ],
  setupFilesAfterEnv: ['<rootDir>/test-utils/jestAfterEnv.js'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^expo-view-shot$': '<rootDir>/__mocks__/ViewShot.js',
    '^uuid$': require.resolve('uuid'),
  },
  collectCoverage: true,
  coverageReporters: ['lcov', 'text', 'html'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/test-utils/'],
  reporters: ['default'],
}; 