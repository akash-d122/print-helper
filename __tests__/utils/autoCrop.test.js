import { autoCropImage } from '../../src/utils/autoCrop';
// import OpenCV from 'react-native-opencv3';
import * as FileSystem from 'expo-file-system';
import { ToastAndroid } from 'react-native';

/*
jest.mock('react-native-opencv3', () => ({
  imreadAsync: jest.fn(),
  cvtColorAsync: jest.fn(),
  GaussianBlurAsync: jest.fn(),
  CannyAsync: jest.fn(),
  findContoursAsync: jest.fn(),
  boundingRectAsync: jest.fn(),
  cropAsync: jest.fn(),
}));
*/

describe('autoCropImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return the original uri and log a warning', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const uri = 'file:///test.jpg';
    const result = await autoCropImage(uri);
    expect(result).toBe(uri);
    expect(consoleWarnSpy).toHaveBeenCalledWith('autoCropImage is a placeholder and does not perform cropping.');
    consoleWarnSpy.mockRestore();
  });

  /*
  it('should successfully crop an image with detected contours', async () => {
    OpenCV.findContoursAsync.mockResolvedValue([
      { contour: 'mock-contour', contourArea: 100 }
    ]);
    OpenCV.boundingRectAsync.mockResolvedValue({ x: 0, y: 0, width: 10, height: 10 });
    OpenCV.cropAsync.mockResolvedValue('mock-base64-data');

    const uri = await autoCropImage('file:///test.jpg');
    expect(OpenCV.cropAsync).toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(uri).toMatch(/crop_.*\.jpg/);
  });

  it('should show toast and return original URI if no contours are found', async () => {
    const toastSpy = jest.spyOn(ToastAndroid, 'show');
    OpenCV.findContoursAsync.mockResolvedValue([]);
    
    const uri = await autoCropImage('file:///test.jpg');

    expect(toastSpy).toHaveBeenCalledWith('Auto crop failed', ToastAndroid.SHORT);
    expect(uri).toBe('file:///test.jpg');
  });

  it('should show toast and return original URI on failure', async () => {
    const toastSpy = jest.spyOn(ToastAndroid, 'show');
    OpenCV.imreadAsync.mockRejectedValue(new Error('imread failed'));
    
    const uri = await autoCropImage('file:///test.jpg');
    
    expect(toastSpy).toHaveBeenCalledWith('Auto crop failed', ToastAndroid.SHORT);
    expect(uri).toBe('file:///test.jpg');
  });
  */
}); 