import React, { useState } from 'react';
import { View, Text, Button, FlatList, Image, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { PRINT_CONFIG } from '../utils/constants';
import { useDispatch } from 'react-redux';
import { setSelectedImages } from '../store/imageSlice';
import { autoCropImage } from '../utils/autoCrop';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { useNavigation } from '@react-navigation/native';

const ImagePickerScreen = () => {
  const [selectedImages, setSelectedImagesState] = useState([]);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [currentCropIdx, setCurrentCropIdx] = useState(0);
  const [cropping, setCropping] = useState(false);
  const navigation = useNavigation();

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
        handlePickedImages(validImages);
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
      handlePickedImages(waAssets.assets);
      setError('');
    } catch (e) {
      setError('Failed to access WhatsApp Images.');
    }
  };

  // Stub for auto crop (replace with real edge detection/crop logic)
  const autoCropImage = async (img) => {
    // TODO: Implement edge detection and crop
    return img.uri; // For now, just return original
  };

  // Stub for manual crop (replace with real crop UI navigation)
  const manualCropImage = async (img) => {
    return new Promise((resolve) => {
      navigation.navigate('ManualCrop', {
        imageUri: img.uri,
        onCrop: (croppedUri) => {
          resolve(croppedUri);
        },
      });
    });
  };

  // After picking images, show crop modal for each
  const handlePickedImages = (images) => {
    setPendingImages(images);
    setCurrentCropIdx(0);
    setCropModalVisible(true);
  };

  // Handle crop option selection
  const handleCropOption = async (option) => {
    const img = pendingImages[currentCropIdx];
    let uri = img.uri;
    if (option === 'auto') {
      setCropping(true);
      uri = await autoCropImage(img.uri);
      setCropping(false);
    }
    if (option === 'manual') uri = await manualCropImage(img);
    // Save to Redux
    const updated = [...selectedImages, { ...img, uri }];
    setSelectedImagesState(updated);
    dispatch(setSelectedImages(updated));
    // Next image or close
    if (currentCropIdx < pendingImages.length - 1) {
      setCurrentCropIdx(currentCropIdx + 1);
    } else {
      setCropModalVisible(false);
      setPendingImages([]);
      setCurrentCropIdx(0);
    }
  };

  const renderImage = ({ item }) => (
    <Image source={{ uri: item.uri }} style={styles.thumbnail} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Images</Text>
      <View style={styles.buttonRow}>
        <Button title="Pick from Gallery" onPress={pickImages} />
        <Button title="WhatsApp Images" onPress={pickWhatsAppImages} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={selectedImages}
        renderItem={renderImage}
        keyExtractor={item => item.id || item.uri}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />
      <Text style={styles.counter}>{selectedImages.length} / {PRINT_CONFIG.maxBatchSize} selected</Text>
      <Modal visible={cropModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, alignItems: 'center', width: 300 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Crop Image</Text>
            <Text style={{ marginBottom: 16 }}>Choose how to crop this image:</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => handleCropOption('auto')} style={{ backgroundColor: '#2563EB', padding: 10, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Auto Crop</Text>
              </Pressable>
              <Pressable onPress={() => handleCropOption('manual')} style={{ backgroundColor: '#10B981', padding: 10, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Manual Crop</Text>
              </Pressable>
              <Pressable onPress={() => handleCropOption('skip')} style={{ backgroundColor: '#6B7280', padding: 10, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Skip</Text>
              </Pressable>
            </View>
            {cropping && <LoadingOverlay />}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#2563EB' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  error: { color: 'red', marginBottom: 8 },
  grid: { gap: 8 },
  thumbnail: { width: 100, height: 100, margin: 4, borderRadius: 8 },
  counter: { marginTop: 12, textAlign: 'center', color: '#2563EB' },
});

export default ImagePickerScreen; 