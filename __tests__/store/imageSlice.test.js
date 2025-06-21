import imageReducer, { setSelectedImages, clearSelectedImages } from '../../src/store/imageSlice';

describe('imageSlice reducer', () => {
  const initialState = {
    selectedImages: [],
  };

  it('should handle initial state', () => {
    expect(imageReducer(undefined, { type: 'unknown' })).toEqual({
      selectedImages: [],
    });
  });

  it('should handle setSelectedImages', () => {
    const images = [{ uri: 'image1.jpg' }, { uri: 'image2.jpg' }];
    const action = setSelectedImages(images);
    const state = imageReducer(initialState, action);
    expect(state.selectedImages).toEqual(images);
  });

  it('should handle clearSelectedImages', () => {
    const previousState = {
      selectedImages: [{ uri: 'image1.jpg' }],
    };
    const action = clearSelectedImages();
    const state = imageReducer(previousState, action);
    expect(state.selectedImages).toEqual([]);
  });
  
  it('should overwrite existing images with setSelectedImages', () => {
    const previousState = {
      selectedImages: [{ uri: 'old.jpg' }],
    };
    const newImages = [{ uri: 'new1.jpg' }];
    const action = setSelectedImages(newImages);
    const state = imageReducer(previousState, action);
    expect(state.selectedImages).toEqual(newImages);
  });
}); 