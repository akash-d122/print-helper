module.exports = {
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async (opts) => true),
  AndroidNotificationPriority: { HIGH: 'high' },
}; 