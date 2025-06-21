import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { PRINT_CONFIG } from '../utils/constants';

export function useImagePicker() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [error, setError] = useState('');

  // Pick images from gallery
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access gallery is required!');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: PRINT_CONFIG.maxBatchSize,
      });
      if (!result.canceled) {
        const validImages = result.assets.filter(img => {
          if (img.fileSize && img.fileSize > PRINT_CONFIG.maxImageSizeMB * 1024 * 1024) {
            setError(`Image ${img.fileName || img.uri} is too large!`);
            return false;
          }
          return true;
        });
        setSelectedImages(validImages);
        setError('');
      }
    } catch (e) {
      setError('Failed to pick images.');
    }
  };

  // Shortcut to WhatsApp Images folder (Android only)
  const pickWhatsAppImages = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access media library is required!');
        return;
      }
      // WhatsApp Images path (Android)
      const waDir = 'WhatsApp/Media/WhatsApp Images';
      const waAssets = await MediaLibrary.getAssetsAsync({
        first: PRINT_CONFIG.maxBatchSize,
        mediaType: 'photo',
        album: waDir,
      });
      if (waAssets.assets.length === 0) {
        setError('No WhatsApp images found.');
        return;
      }
      setSelectedImages(waAssets.assets);
      setError('');
    } catch (e) {
      setError('Failed to access WhatsApp Images.');
    }
  };

  return {
    selectedImages,
    setSelectedImages,
    error,
    setError,
    pickImages,
    pickWhatsAppImages,
  };
} 