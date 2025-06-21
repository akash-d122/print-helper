import React, { useRef, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Button, Alert } from 'react-native';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, withTiming } from 'react-native-reanimated';
import * as ImageEditor from '@react-native-community/image-editor';
import * as FileSystem from 'expo-file-system';

const SCREEN = Dimensions.get('window');

export default function ManualCropScreen({ route, navigation }) {
  const { imageUri, onCrop } = route.params;
  const [cropRect, setCropRect] = useState({ x: 40, y: 80, width: SCREEN.width - 80, height: SCREEN.width - 80 });
  const [processing, setProcessing] = useState(false);

  // Pan/zoom state
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Pan gesture
  const panHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
  });

  // Pinch gesture
  const pinchHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startScale = scale.value;
    },
    onActive: (event, ctx) => {
      scale.value = Math.max(1, Math.min(4, ctx.startScale * event.scale));
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Drag handles for crop rect (not fully implemented for brevity)
  // TODO: Add drag handles for all corners/sides

  const handleApply = async () => {
    setProcessing(true);
    try {
      const cropData = {
        offset: { x: cropRect.x, y: cropRect.y },
        size: { width: cropRect.width, height: cropRect.height },
        displaySize: { width: cropRect.width, height: cropRect.height },
        resizeMode: 'contain',
      };
      const croppedUri = await ImageEditor.cropImage(imageUri, cropData);
      setProcessing(false);
      onCrop(croppedUri);
      navigation.goBack();
    } catch (e) {
      setProcessing(false);
      Alert.alert('Crop failed', e.message);
    }
  };

  const handleCancel = () => {
    onCrop(imageUri);
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <PanGestureHandler onGestureEvent={panHandler}>
        <Animated.View style={[styles.imageWrapper, animatedStyle]}>
          <PinchGestureHandler onGestureEvent={pinchHandler}>
            <Animated.Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
          </PinchGestureHandler>
          {/* Crop box overlay */}
          <View style={[styles.cropBox, {
            left: cropRect.x,
            top: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
          }]} />
        </Animated.View>
      </PanGestureHandler>
      <View style={styles.btnRow}>
        <Button title="Cancel" onPress={handleCancel} color="#6B7280" />
        <Button title={processing ? 'Cropping...' : 'Apply'} onPress={handleApply} color="#2563EB" disabled={processing} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  imageWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN.width, height: SCREEN.height * 0.7 },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    zIndex: 10,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
}); 