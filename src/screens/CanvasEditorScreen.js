import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Alert, ActivityIndicator, ToastAndroid, Modal, Button } from 'react-native';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, withDecay, withTiming, runOnJS } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import GridOverlay from '../components/canvas/GridOverlay';
import { useCanvasRef } from '../context/CanvasRefContext';
import { enhanceImage, isEnhancing } from '../services/ImageEnhancerService';
import { FilterManager } from '../services/FilterService';
import LoadingOverlay from '../components/common/LoadingOverlay';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCALE_FACTOR = SCREEN_WIDTH / A4_WIDTH;
const HISTORY_LIMIT = 15;

const LAYOUTS = [
  { key: 'full', label: 'Full Page' },
  { key: 'centered', label: 'Centered' },
  { key: 'split2v', label: '2-Vertical' },
  { key: 'split2h', label: '2-Horizontal' },
  { key: 'grid4', label: '4-Grid' },
];

const layoutConfig = {
  full: [
    { x: 0, y: 0, w: 1, h: 1 },
  ],
  centered: [
    { x: 0.08, y: 0.03, w: 0.84, h: 0.94 }, // respect margin
  ],
  split2v: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ],
  split2h: [
    { x: 0, y: 0, w: 1, h: 0.5 },
    { x: 0, y: 0.5, w: 1, h: 0.5 },
  ],
  grid4: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
};

export default function CanvasEditorScreen() {
  // Redux: get selected images
  const selectedImages = useSelector(state => state.images.selectedImages);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layout, setLayout] = useState('full');
  const zones = layoutConfig[layout];

  // Transformation state (for whole canvas)
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0); // degrees

  // Undo/redo stack
  const [history, setHistory] = useState([]); // [{scale, translateX, translateY, rotation}]
  const [future, setFuture] = useState([]);

  // Enhanced image URIs per zone (local state for now)
  const [enhancedImages, setEnhancedImages] = useState({});
  const [enhancingZone, setEnhancingZone] = useState(null);

  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [filteringImage, setFilteringImage] = useState(null); // { uri, zoneIdx, filterType }

  // Save current transform to history
  const saveToHistory = () => {
    setHistory(prev => {
      const entry = {
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
        rotation: rotation.value,
      };
      const newHistory = [...prev, entry];
      return newHistory.length > HISTORY_LIMIT ? newHistory.slice(-HISTORY_LIMIT) : newHistory;
    });
    setFuture([]); // Clear redo stack
  };

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
    onEnd: (event) => {
      translateX.value = withDecay({ velocity: event.velocityX });
      translateY.value = withDecay({ velocity: event.velocityY });
      runOnJS(saveToHistory)();
    },
  });

  // Pinch gesture
  const pinchHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startScale = scale.value;
    },
    onActive: (event, ctx) => {
      scale.value = Math.max(0.5, Math.min(3, ctx.startScale * event.scale));
    },
    onEnd: () => {
      runOnJS(saveToHistory)();
    },
  });

  // Rotation controls
  const rotate = (deg) => {
    rotation.value = withTiming(rotation.value + deg, { duration: 200 });
    saveToHistory();
  };

  // Undo/Redo logic
  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFuture(f => [{
      scale: scale.value,
      translateX: translateX.value,
      translateY: translateY.value,
      rotation: rotation.value,
    }, ...f]);
    scale.value = withTiming(prev.scale, { duration: 150 });
    translateX.value = withTiming(prev.translateX, { duration: 150 });
    translateY.value = withTiming(prev.translateY, { duration: 150 });
    rotation.value = withTiming(prev.rotation, { duration: 150 });
  };
  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(f => f.slice(1));
    setHistory(h => [...h, {
      scale: scale.value,
      translateX: translateX.value,
      translateY: translateY.value,
      rotation: rotation.value,
    }]);
    scale.value = withTiming(next.scale, { duration: 150 });
    translateX.value = withTiming(next.translateX, { duration: 150 });
    translateY.value = withTiming(next.translateY, { duration: 150 });
    rotation.value = withTiming(next.rotation, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Enhance handler
  const handleEnhance = async (zoneIdx, img) => {
    setEnhancingZone(zoneIdx);
    try {
      const enhancedUri = await enhanceImage(img.uri);
      setEnhancedImages(prev => ({ ...prev, [zoneIdx]: enhancedUri }));
      setEnhancingZone(null);
    } catch (e) {
      setEnhancingZone(null);
      ToastAndroid.show('Enhancement failed', ToastAndroid.SHORT);
    }
  };

  const onFilterComplete = async (resultUri) => {
    try {
      const base64Data = resultUri.split(',')[1];
      const newUri = `${FileSystem.cacheDirectory}filter_${filteringImage.filterType}_${uuidv4()}.jpg`;
      await FileSystem.writeAsStringAsync(newUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
      });

      setEnhancedImages(prev => ({ ...prev, [filteringImage.zoneIdx]: newUri }));
      setActiveFilter(filteringImage.filterType);
      setFilterLoading(false);
      setFilteringImage(null);
      setFilterModalVisible(false);
    } catch(e) {
      onFilterError(e);
    }
  };

  const onFilterError = (e) => {
    console.error('Filter failed', e);
    setFilterLoading(false);
    setFilteringImage(null);
    ToastAndroid.show('Filter failed', ToastAndroid.SHORT);
  };

  // Filter handler
  const handleApplyFilter = async (filterType) => {
    if (filterType === 'reset') {
        // Reset logic: find the original URI and reset the enhanced one
        // This part needs careful implementation based on how you track original vs. enhanced
        return;
    }
    setFilterLoading(true);
    const imgIdx = currentIndex;
    const img = selectedImages[imgIdx];
    const uri = enhancedImages[imgIdx] || img.uri;
    
    setFilteringImage({
        uri,
        zoneIdx: imgIdx,
        filterType
    });
  };

  // Layout image rendering with enhance button
  const renderLayoutImages = () => {
    if (!selectedImages || selectedImages.length < zones.length) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Not enough images for this layout</Text>
        </View>
      );
    }
    return zones.map((zone, i) => {
      const img = selectedImages[i];
      if (!img) return null;
      const uri = enhancedImages[i] || img.uri;
      return (
        <View key={i} style={[styles.zoneImage, {
          position: 'absolute',
          left: `${zone.x * 100}%`,
          top: `${zone.y * 100}%`,
          width: `${zone.w * 100}%`,
          height: `${zone.h * 100}%`,
        }]}
        >
          <Animated.Image
            source={{ uri }}
            style={styles.zoneImageInner}
            resizeMode="contain"
          />
          {/* Enhance button overlay */}
          {!enhancedImages[i] && (
            <TouchableOpacity
              style={styles.enhanceBtn}
              onPress={() => handleEnhance(i, img)}
              disabled={enhancingZone !== null}
            >
              {enhancingZone === i ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.enhanceBtnText}>Enhance</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    });
  };

  const canvasRef = useCanvasRef();

  return (
    <View style={styles.root} pointerEvents={enhancingZone !== null ? 'none' : 'auto'}>
      <FilterManager
        imageUri={filteringImage?.uri}
        filterType={filteringImage?.filterType}
        onFilterComplete={onFilterComplete}
        onFilterError={onFilterError}
      />
      {/* Layout Switcher */}
      <View style={styles.layoutSwitcher}>
        {LAYOUTS.map(l => (
          <TouchableOpacity
            key={l.key}
            style={[styles.layoutBtn, layout === l.key && styles.layoutBtnActive]}
            onPress={() => setLayout(l.key)}
          >
            <Text style={[styles.layoutBtnText, layout === l.key && styles.layoutBtnTextActive]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.canvasFrame} ref={canvasRef}>
        <View style={styles.marginGuide} pointerEvents="none" />
        <GridOverlay width={SCREEN_WIDTH} height={SCREEN_WIDTH * (A4_HEIGHT / A4_WIDTH)} scale={scale.value} visible={true} />
        <PanGestureHandler onGestureEvent={panHandler}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <PinchGestureHandler onGestureEvent={pinchHandler}>
              <View style={StyleSheet.absoluteFill}>{renderLayoutImages()}</View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => rotate(-90)}><Text style={styles.ctrlText}>⟲ 90°</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => rotate(-15)}><Text style={styles.ctrlText}>⟲ 15°</Text></TouchableOpacity>
          <Text style={styles.ctrlText}>{Math.round(rotation.value) % 360}°</Text>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => rotate(15)}><Text style={styles.ctrlText}>⟳ 15°</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => rotate(90)}><Text style={styles.ctrlText}>⟳ 90°</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={undo} disabled={history.length === 0}><Text style={[styles.ctrlText, history.length === 0 && styles.disabled]}>↶ Undo</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={redo} disabled={future.length === 0}><Text style={[styles.ctrlText, future.length === 0 && styles.disabled]}>↷ Redo</Text></TouchableOpacity>
        </View>
      </View>
      {/* Add Filters button to toolbar (above canvasFrame) */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
        <TouchableOpacity style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 8, marginHorizontal: 4 }} onPress={() => setFilterModalVisible(true)}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Filters</Text>
        </TouchableOpacity>
      </View>
      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, alignItems: 'center', width: 300 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Apply Filter</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity onPress={() => handleApplyFilter('bw')} style={{ backgroundColor: '#1F2937', padding: 10, borderRadius: 8 }}><Text style={{ color: '#fff' }}>B&W</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleApplyFilter('grayscale')} style={{ backgroundColor: '#6B7280', padding: 10, borderRadius: 8 }}><Text style={{ color: '#fff' }}>Grayscale</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleApplyFilter('contrast')} style={{ backgroundColor: '#F59E0B', padding: 10, borderRadius: 8 }}><Text style={{ color: '#fff' }}>Contrast</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleApplyFilter('reset')} style={{ backgroundColor: '#10B981', padding: 10, borderRadius: 8 }}><Text style={{ color: '#fff' }}>Reset</Text></TouchableOpacity>
            </View>
            {filterLoading && <LoadingOverlay />}
            <Button title="Close" onPress={() => setFilterModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
  },
  layoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  layoutBtnActive: {
    backgroundColor: '#2563EB',
  },
  layoutBtnText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 14,
  },
  layoutBtnTextActive: {
    color: '#fff',
  },
  canvasFrame: {
    width: SCREEN_WIDTH,
    aspectRatio: A4_WIDTH / A4_HEIGHT,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563EB',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneImage: {
    position: 'absolute',
    overflow: 'hidden',
  },
  zoneImageInner: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  marginGuide: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    margin: 24,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  fallbackText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 8,
    marginHorizontal: 16,
    gap: 8,
  },
  ctrlBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  ctrlText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabled: {
    color: '#bdbdbd',
  },
  enhanceBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
    elevation: 2,
  },
  enhanceBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
}); 