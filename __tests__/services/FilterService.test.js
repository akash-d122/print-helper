import { applyFilters } from '../../src/services/FilterService';
import OpenCV from 'react-native-opencv3';
import { ToastAndroid } from 'react-native';

jest.mock('react-native-opencv3', () => ({
  imreadAsync: jest.fn(),
  cvtColorAsync: jest.fn(),
  thresholdAsync: jest.fn(),
}));

describe('FilterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply a B&W filter successfully', async () => {
    const uri = await applyFilters('file:///test.jpg', 'bw');
    expect(OpenCV.imreadAsync).toHaveBeenCalledWith('file:///test.jpg');
    expect(uri).toContain('filter_bw_mock-uuid.jpg');
  });

  it('should return original URI for "reset" filter', async () => {
    const uri = await applyFilters('file:///test.jpg', 'reset');
    expect(OpenCV.imreadAsync).not.toHaveBeenCalled();
    expect(uri).toBe('file:///test.jpg');
  });

  it('should show a toast and return original URI on failure', async () => {
    const toastSpy = jest.spyOn(ToastAndroid, 'show');
    OpenCV.imreadAsync.mockRejectedValue(new Error('imread failed'));
    
    const uri = await applyFilters('file:///test.jpg', 'bw');
    
    expect(toastSpy).toHaveBeenCalledWith('Filter failed', ToastAndroid.SHORT);
    expect(uri).toBe('file:///test.jpg');
  });
}); 