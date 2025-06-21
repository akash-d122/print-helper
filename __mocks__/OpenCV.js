module.exports = {
  imreadAsync: jest.fn(async (uri) => `mat:${uri}`),
  cvtColorAsync: jest.fn(async (src, dst, code) => dst),
  thresholdAsync: jest.fn(async (src, dst, thresh, maxval, type) => dst),
  CannyAsync: jest.fn(async (src, dst, t1, t2) => dst),
  findContoursAsync: jest.fn(async (mat, mode, method) => [
    [{ x: 0, y: 0 }, { x: 100, y: 100 }],
  ]),
  boundingRectAsync: jest.fn(async (cnt) => ({ x: 0, y: 0, width: 100, height: 100 })),
  cropAsync: jest.fn(async (uri, x, y, w, h) => 'base64-cropped-image'),
  equalizeHistAsync: jest.fn(async (src, dst) => dst),
  COLOR_RGBA2GRAY: 0,
  THRESH_BINARY: 0,
  RETR_EXTERNAL: 0,
  CHAIN_APPROX_SIMPLE: 0,
}; 