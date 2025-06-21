module.exports = {
  getInfoAsync: jest.fn(async (uri) => ({ exists: true, size: 123456 })),
  writeAsStringAsync: jest.fn(async (uri, data, opts) => uri),
  deleteAsync: jest.fn(async (uri, opts) => true),
  cacheDirectory: '/mock/cache/',
  documentDirectory: '/mock/documents/',
}; 