// jest.setup.js
const originalWarn = console.warn;
jest.spyOn(console, 'warn').mockImplementation((...args) => {
  if (typeof args[0] === 'string' && args[0].includes('ToastAndroid is not supported on this platform')) {
    return;
  }
  originalWarn(...args);
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.DevMenu = {
    show: jest.fn(),
    reload: jest.fn(),
  };
  RN.ToastAndroid = {
    show: jest.fn(),
    SHORT: 'SHORT',
    LONG: 'LONG',
  };
  return RN;
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

global.console = {
  ...console,
  warn: jest.fn(),
};

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler');
  return {
    ...actual,
    PanGestureHandler: ({ children }) => children,
    PinchGestureHandler: ({ children }) => children,
    TapGestureHandler: ({ children }) => children,
    LongPressGestureHandler: ({ children }) => children,
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: ({ children }) => children,
    Directions: {},
    State: {},
  };
});
  
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: false, assets:[{ uri: 'file:///test.jpg' }]})),
}));

jest.mock('expo-view-shot', () => ({
  ...jest.requireActual('expo-view-shot'),
  captureRef: jest.fn().mockResolvedValue('/mock/path'),
}));

jest.mock('expo-file-system', () => ({
  writeAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  documentDirectory: '/mock/documents/',
  EncodingType: { Base64: 'base64' },
  cacheDirectory: '/mock/cache/',
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: () => null,
  Line: () => null,
  Group: () => null,
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
}));

jest.mock('react-native-opencv3', () => ({
  CV_8SC: jest.fn(),
  imread: jest.fn(),
  imshow: jest.fn(),
  cropAsync: jest.fn().mockResolvedValue('cropped_image'),
  cvtColorAsync: jest.fn().mockResolvedValue('converted_image'),
}));

jest.mock('./src/utils/ExportLogger', () => ({
  addToExportHistory: jest.fn().mockResolvedValue(true),
}));

jest.mock('./src/services/ImageEnhancerService', () => ({
  enhanceImage: jest.fn().mockResolvedValue('enhanced_image_data'),
}));

// Mock for ToastAndroid to prevent warnings in tests
/* jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.ToastAndroid = {
    show: jest.fn(),
    SHORT: 'SHORT',
    LONG: 'LONG',
  };
  return rn;
}); */ 