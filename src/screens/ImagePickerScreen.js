import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { View, Text, Button, FlatList, Image, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { PRINT_CONFIG } from '../utils/constants';
import { useDispatch } from 'react-redux';
import { setSelectedImages as dispatchSetSelectedImages } from '../store/imageSlice';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

const workerHtml = require('../workers/cropper.html');

const AutoCropManager = ({ imageUri, onCropComplete, onCropError }) => {
    const webViewRef = useRef(null);
    const [isWebViewReady, setWebViewReady] = useState(false);

    useEffect(() => {
        if (isWebViewReady && imageUri && webViewRef.current) {
            FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 })
                .then(base64 => {
                    const dataUrl = `data:image/jpeg;base64,${base64}`;
                    const message = JSON.stringify({ type: 'PROCESS_IMAGE', payload: { uri: dataUrl } });
                    webViewRef.current.postMessage(message);
                })
                .catch(onCropError);
        }
    }, [isWebViewReady, imageUri, onCropError]);

    const handleMessage = (event) => {
        const { type, payload } = JSON.parse(event.nativeEvent.data);
        switch (type) {
            case 'READY':
                setWebViewReady(true);
                break;
            case 'SUCCESS':
                onCropComplete(payload.uri);
                break;
            case 'ERROR':
                onCropError(new Error(payload));
                break;
        }
    };

    if (!imageUri) return null;

    return (
        <View style={{ width: 0, height: 0 }}>
            <WebView
                ref={webViewRef}
                source={workerHtml}
                onMessage={handleMessage}
                javaScriptEnabled
                domStorageEnabled
            />
        </View>
    );
};

const ImagePickerScreen = () => {
  const [selectedImages, setSelectedImagesState] = useState([]);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [currentCropIdx, setCurrentCropIdx] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [croppingUri, setCroppingUri] = useState(null);
  const navigation = useNavigation();

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access gallery is required!');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
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

  const pickWhatsAppImages = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access media library is required!');
        return;
      }
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

  const handlePickedImages = (images) => {
    setPendingImages(images);
    setCurrentCropIdx(0);
    setCropModalVisible(true);
  };

  const onCropComplete = async (resultUri) => {
    try {
        const base64Data = resultUri.split(',')[1];
        const newUri = `${FileSystem.cacheDirectory}crop_${uuidv4()}.jpg`;
        await FileSystem.writeAsStringAsync(newUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
        });
        
        const img = pendingImages[currentCropIdx];
        const updated = [...selectedImages, { ...img, uri: newUri }];
        setSelectedImagesState(updated);
        dispatch(dispatchSetSelectedImages(updated));
        
        setCropping(false);
        setCroppingUri(null);

        if (currentCropIdx < pendingImages.length - 1) {
            setCurrentCropIdx(currentCropIdx + 1);
        } else {
            setCropModalVisible(false);
        }
    } catch (e) {
        onCropError(e);
    }
  };

  const onCropError = (e) => {
    console.error(e);
    setCropping(false);
    setCroppingUri(null);
    Alert.alert('Crop Failed', 'Could not auto-crop the image. Skipping crop.');
    handleCropOption('skip');
  }

  // Handle crop option selection
  const handleCropOption = async (option) => {
    const img = pendingImages[currentCropIdx];
    if (option === 'auto') {
      setCropping(true);
      setCroppingUri(img.uri); // This triggers the AutoCropManager
      return; // The rest is handled by onCropComplete/onCropError
    }

    let uri = img.uri;
    if (option === 'manual') {
      uri = await manualCropImage(img);
    }
    
    // Save to Redux for 'manual' and 'skip'
    const updated = [...selectedImages, { ...img, uri }];
    setSelectedImagesState(updated);
    dispatch(dispatchSetSelectedImages(updated));

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
       <AutoCropManager 
         imageUri={croppingUri}
         onCropComplete={onCropComplete}
         onCropError={onCropError}
       />
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