// App Constants
export const APP_CONFIG = {
  name: 'A4 Print Studio',
  version: '1.0.0',
  author: 'Print Shop Solutions',
};

// Canvas Dimensions (A4 at 300 DPI)
export const CANVAS_CONFIG = {
  width: 2480,
  height: 3508,
  aspectRatio: 2480 / 3508,
  marginTop: 100,
  marginBottom: 100,
  marginLeft: 80,
  marginRight: 80,
};

// Print Settings
export const PRINT_CONFIG = {
  supportedDPI: [150, 200, 300, 600],
  defaultDPI: 300,
  maxImageSizeMB: 50,
  maxBatchSize: 20,
  supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
};

// Performance Limits
export const PERFORMANCE_CONFIG = {
  maxMemoryUsageMB: 200,
  imageProcessingTimeoutMs: 30000,
  maxConcurrentOperations: 3,
  thumbnailSize: 150,
};

// Filter Types
export const FILTER_TYPES = {
  NONE: 'none',
  BLACKWHITE: 'blackwhite',
  GRAYSCALE: 'grayscale',
  SEPIA: 'sepia',
  CONTRAST: 'contrast',
  BRIGHTNESS: 'brightness',
  PRINT_OPTIMIZE: 'print_optimize',
};

// Layout Templates
export const LAYOUT_TEMPLATES = {
  CENTERED: 'centered',
  FULL_BLEED: 'full_bleed',
  TOP_LEFT: 'top_left',
  TOP_RIGHT: 'top_right',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_RIGHT: 'bottom_right',
  CUSTOM: 'custom',
}; 