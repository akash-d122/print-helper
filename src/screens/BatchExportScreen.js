import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ToastAndroid, AppState, Alert, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import { enhanceImage } from '../services/ImageEnhancerService';
import { captureCanvas, createPDF } from '../services/PDFService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initNotifications, sendExportCompleteNotification } from '../services/NotificationService';

const STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};
const EXPORT_BG_KEY = 'exportInBackground';
const EXPORT_JOB_KEY = 'batchExportJob';

export default function BatchExportScreen() {
  const selectedImages = useSelector(state => state.images.selectedImages);
  const [queue, setQueue] = useState(
    selectedImages.map(img => ({ ...img, status: STATUS.PENDING, pdfPath: null, error: null }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [summary, setSummary] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [exportInBackground, setExportInBackground] = useState(true);
  const [isAppInBackground, setIsAppInBackground] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Load exportInBackground setting
  useEffect(() => {
    AsyncStorage.getItem(EXPORT_BG_KEY).then(val => {
      if (val !== null) setExportInBackground(val === 'true');
    });
  }, []);

  // Job recovery on mount
  useEffect(() => {
    (async () => {
      try {
        const savedJob = await AsyncStorage.getItem(EXPORT_JOB_KEY);
        if (savedJob) {
          const job = JSON.parse(savedJob);
          if (job.queue && Array.isArray(job.queue) && typeof job.currentIdx === 'number') {
            setQueue(job.queue);
            setCurrentIdx(job.currentIdx);
            setAutoEnhance(job.autoEnhance ?? true);
            setShowResumeModal(true);
          } else {
            setRecoveryError('Corrupted export job data.');
            await AsyncStorage.removeItem(EXPORT_JOB_KEY);
          }
        }
      } catch (e) {
        setRecoveryError('Failed to load export job.');
      }
    })();
  }, []);

  // AppState listener
  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      const isBg = nextState !== 'active';
      setIsAppInBackground(isBg);
      if (isBg && isRunning && !exportInBackground) {
        setIsRunning(false);
        ToastAndroid.show('Export paused (app in background)', ToastAndroid.SHORT);
      } else if (!isBg && !isRunning && queue.some(q => q.status === STATUS.PROCESSING)) {
        setIsRunning(true);
        ToastAndroid.show('Resuming export', ToastAndroid.SHORT);
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isRunning, exportInBackground, queue]);

  // Persist job state after each export or status change
  useEffect(() => {
    if (isRunning || processing) {
      AsyncStorage.setItem(EXPORT_JOB_KEY, JSON.stringify({
        queue,
        currentIdx,
        autoEnhance,
      }));
    }
  }, [queue, currentIdx, autoEnhance, isRunning, processing]);

  // Notification setup on mount
  useEffect(() => {
    initNotifications();
  }, []);

  // Simulate a hidden canvas for export (in real app, use a headless renderer or offscreen ref)
  const hiddenCanvasRef = useRef();

  const processQueue = async (startIdx = 0) => {
    setProcessing(true);
    let idx = startIdx;
    let succeeded = 0;
    let failed = 0;
    const startTime = Date.now();
    while (idx < queueRef.current.length && isRunning) {
      setCurrentIdx(idx);
      updateQueueStatus(idx, STATUS.PROCESSING);
      let img = queueRef.current[idx];
      let imageUri = img.uri;
      try {
        if (autoEnhance) {
          imageUri = await enhanceImage(imageUri);
        }
        // Simulate rendering image to hidden canvas and capturing
        // In a real app, render the image in a hidden CanvasEditor and capture
        const imageBuffer = await captureCanvas(hiddenCanvasRef, 300); // 300 DPI default
        const pdfPath = await createPDF(imageBuffer, 300);
        updateQueueStatus(idx, STATUS.COMPLETED, pdfPath);
        succeeded++;
      } catch (e) {
        updateQueueStatus(idx, STATUS.FAILED, null, e.message);
        failed++;
      }
      idx++;
      // Persist after each image
      await AsyncStorage.setItem(EXPORT_JOB_KEY, JSON.stringify({
        queue: queueRef.current,
        currentIdx: idx,
        autoEnhance,
      }));
    }
    setProcessing(false);
    setIsRunning(false);
    setSummary({
      total: queueRef.current.length,
      succeeded,
      failed,
      time: ((Date.now() - startTime) / 1000).toFixed(1),
    });
    ToastAndroid.show('Batch export complete', ToastAndroid.LONG);
    // Send notification if in background and background export is enabled
    if (isAppInBackground && exportInBackground) {
      await sendExportCompleteNotification();
    }
    // Clear job state on completion
    await AsyncStorage.removeItem(EXPORT_JOB_KEY);
  };

  const updateQueueStatus = (idx, status, pdfPath = null, error = null) => {
    setQueue(q => {
      const newQ = [...q];
      newQ[idx] = { ...newQ[idx], status, pdfPath, error };
      return newQ;
    });
  };

  const startExport = () => {
    if (isAppInBackground && !exportInBackground) {
      Alert.alert('Export in background is OFF', 'Please return to the app to continue export.');
      return;
    }
    setIsRunning(true);
    setSummary(null);
    processQueue(queue.findIndex(q => q.status === STATUS.PENDING));
  };
  const pauseExport = () => setIsRunning(false);
  const resumeExport = () => {
    setIsRunning(true);
    processQueue(currentIdx);
  };
  const retryFailed = () => {
    setQueue(q => q.map(item => item.status === STATUS.FAILED ? { ...item, status: STATUS.PENDING, error: null } : item));
    setIsRunning(true);
    setSummary(null);
    processQueue(queue.findIndex(q => q.status === STATUS.PENDING));
  };
  const discardJob = async () => {
    await AsyncStorage.removeItem(EXPORT_JOB_KEY);
    setShowResumeModal(false);
    setQueue(selectedImages.map(img => ({ ...img, status: STATUS.PENDING, pdfPath: null, error: null })));
    setCurrentIdx(0);
    setSummary(null);
    setIsRunning(false);
  };
  const resumeJob = () => {
    setShowResumeModal(false);
    setIsRunning(true);
    setSummary(null);
    processQueue(currentIdx);
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.itemRow}>
      <Text style={styles.idx}>{index + 1}.</Text>
      <Text numberOfLines={1} style={styles.uri}>{item.uri.split('/').pop()}</Text>
      <Text style={[styles.status, styles[item.status.toLowerCase()]]}>{item.status}</Text>
      {item.status === STATUS.PROCESSING && <ActivityIndicator size="small" color="#2563EB" />}
      {item.status === STATUS.FAILED && <TouchableOpacity onPress={retryFailed}><Text style={styles.error}>Retry</Text></TouchableOpacity>}
    </View>
  );

  const completedCount = queue.filter(q => q.status === STATUS.COMPLETED).length;

  return (
    <View style={styles.container}>
      <Modal visible={showResumeModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Resume your last export job?</Text>
            <View style={styles.modalBtnRow}>
              <Button title="Resume" onPress={resumeJob} />
              <Button title="Discard" onPress={discardJob} color="#DC2626" />
            </View>
          </View>
        </View>
      </Modal>
      {recoveryError && <Text style={styles.error}>{recoveryError}</Text>}
      <Text style={styles.title}>Batch Export Queue</Text>
      <Text style={styles.progress}>{completedCount} of {queue.length} exported</Text>
      <View style={styles.toggleRow}>
        <Text>Auto-enhance:</Text>
        <Button title={autoEnhance ? 'On' : 'Off'} onPress={() => setAutoEnhance(a => !a)} />
      </View>
      <FlatList
        data={queue}
        renderItem={renderItem}
        keyExtractor={item => item.uri}
        style={styles.list}
      />
      <View style={styles.controls}>
        {!isRunning && !processing ? (
          <Button title={completedCount === queue.length ? 'Restart' : 'Start Export'} onPress={startExport} />
        ) : (
          <Button title="Pause" onPress={pauseExport} disabled={processing} />
        )}
        {(!isRunning && completedCount < queue.length && completedCount > 0) && (
          <Button title="Resume" onPress={resumeExport} />
        )}
      </View>
      {summary && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Export Summary:</Text>
          <Text style={styles.summaryText}>Succeeded: {summary.succeeded}</Text>
          <Text style={styles.summaryText}>Failed: {summary.failed}</Text>
          <Text style={styles.summaryText}>Total Time: {summary.time}s</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#2563EB' },
  progress: { marginBottom: 8, color: '#2563EB', fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  list: { flex: 1, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  idx: { width: 24, color: '#888' },
  uri: { flex: 1, color: '#333' },
  status: { width: 90, textAlign: 'center', fontWeight: 'bold' },
  pending: { color: '#888' },
  processing: { color: '#F59E0B' },
  completed: { color: '#10B981' },
  failed: { color: '#DC2626' },
  error: { color: '#DC2626', marginLeft: 8 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  summary: { marginTop: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 },
  summaryText: { color: '#2563EB', fontWeight: 'bold', marginBottom: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', padding: 24, borderRadius: 12, alignItems: 'center', elevation: 4 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#2563EB' },
  modalBtnRow: { flexDirection: 'row', gap: 16 },
}); 