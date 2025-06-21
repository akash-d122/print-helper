import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedImages: [],
};

const imageSlice = createSlice({
  name: 'images',
  initialState,
  reducers: {
    setSelectedImages(state, action) {
      state.selectedImages = action.payload;
    },
    clearSelectedImages(state) {
      state.selectedImages = [];
    },
  },
});

export const { setSelectedImages, clearSelectedImages } = imageSlice.actions;
export default imageSlice.reducer; 