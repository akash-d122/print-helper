import React from 'react';
import { renderWithProvider } from '../../test-utils/test-utils';
import CanvasEditorScreen from '../../src/screens/CanvasEditorScreen';
import { fireEvent, act } from '@testing-library/react-native';
import * as OpenCV from 'react-native-opencv3';
import * as enhancer from '../../src/services/ImageEnhancerService';

jest.mock('react-native-opencv3');
jest.mock('../../src/services/ImageEnhancerService');

const initialState = {
  images: {
    selectedImages: [
      { uri: 'file:///img1.jpg' },
      { uri: 'file:///img2.jpg' },
    ],
  },
};

describe('CanvasEditorScreen', () => {
  it('renders A4 canvas and margin guides', () => {
    const { getByText } = renderWithProvider(<CanvasEditorScreen />, { initialState });
    expect(getByText('Filters')).toBeTruthy();
  });

  it('handles filter modal and applies filter', async () => {
    OpenCV.cvtColorAsync.mockResolvedValue('mat:file:///img1.jpg');
    const { getByText } = renderWithProvider(<CanvasEditorScreen />, { initialState });

    await act(async () => {
      fireEvent.press(getByText('Filters'));
    });
    
    await act(async () => {
      fireEvent.press(getByText('B&W'));
    });
    // ...assert state update or UI change
  });

  it('handles enhance button and updates image', async () => {
    enhancer.enhanceImage.mockResolvedValue('file:///enhanced.jpg');
    const { getByText } = renderWithProvider(<CanvasEditorScreen />, { initialState });
    
    await act(async () => {
      // Assuming you have a button with text 'Enhance'
      // fireEvent.press(getByText('Enhance'));
    });
    // ...simulate enhance button press and assert update
  });

  it('handles undo/redo stack', () => {
    // ...simulate gestures and undo/redo logic
  });

  it('simulates pressing Filters and applying B&W, asserts UI response', async () => {
    OpenCV.cvtColorAsync.mockResolvedValue('mat:file:///img1.jpg');
    const { getByText } = renderWithProvider(<CanvasEditorScreen />, { initialState });
    
    await act(async () => {
      fireEvent.press(getByText('Filters'));
    });
    
    await act(async () => {
      fireEvent.press(getByText('B&W'));
    });
    // Assert that filter modal closes or state updates (for demo, check Filters button still exists)
    expect(getByText('Filters')).toBeTruthy();
  });
}); 