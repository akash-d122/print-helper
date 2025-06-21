import React, { useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { captureCanvas, createPDF, sharePDF } from '../services/PDFService';
import { useCanvasRef } from '../context/CanvasRefContext';
import { useNavigation } from '@react-navigation/native';

const DPI_OPTIONS = [150, 300, 600];

export default function ExportScreen() {
  const [dpi, setDpi] = useState(300);
  const [loading, setLoading] = useState(false);
  const [pdfPath, setPdfPath] = useState(null);
  const canvasRef = useCanvasRef();
  const navigation = useNavigation();

  const handleExport = async () => {
    setLoading(true);
    try {
      if (!canvasRef || !canvasRef.current) throw new Error('Canvas not available for export.');
      const imageUri = await captureCanvas(canvasRef, dpi);
      const pdf = await createPDF(imageUri, dpi);
      setPdfPath(pdf);
      setLoading(false);
      Alert.alert('Exported!', 'PDF created successfully.');
    } catch (e) {
      setLoading(false);
      Alert.alert('Export failed', e.message);
    }
  };

  const handleShare = async () => {
    if (pdfPath) {
      await sharePDF(pdfPath);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export to PDF</Text>
      <Text>Select DPI:</Text>
      <View style={styles.dpiRow}>
        {DPI_OPTIONS.map(opt => (
          <Button key={opt} title={`${opt} DPI`} onPress={() => setDpi(opt)} color={dpi === opt ? '#2563EB' : '#888'} />
        ))}
      </View>
      <Button title="Export PDF" onPress={handleExport} disabled={loading} />
      {loading && <ActivityIndicator size="large" color="#2563EB" style={{ margin: 16 }} />}
      {pdfPath && <Button title="Share PDF" onPress={handleShare} />}
      <View style={{ marginTop: 32 }}>
        <Button title="View Export History" onPress={() => navigation.navigate('ExportHistory')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#2563EB' },
  dpiRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
}); 