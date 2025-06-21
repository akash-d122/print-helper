import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Button, Alert, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getExportHistory, deleteExportFromHistory } from '../utils/ExportLogger';

const PDF_ICON = 'https://img.icons8.com/ios-filled/50/000000/pdf.png';

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function ExportHistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await getExportHistory();
    setHistory(data);
    setLoading(false);
  };

  const handleView = async (item) => {
    try {
      await Sharing.shareAsync(item.fileUri, { mimeType: 'application/pdf' });
    } catch {}
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Export', 'Are you sure you want to delete this export?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await FileSystem.deleteAsync(item.fileUri, { idempotent: true });
          } catch {}
          await deleteExportFromHistory(item.id);
          fetchHistory();
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <Image source={{ uri: PDF_ICON }} style={styles.icon} />
      <View style={styles.info}>
        <Text style={styles.filename}>{item.filename}</Text>
        <Text style={styles.meta}>{formatDate(item.timestamp)} • {item.size}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleView(item)} style={styles.actionBtn}><Text style={styles.actionText}>View</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}><Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;
  if (!history.length) return <View style={styles.center}><Text style={styles.empty}>No exports found. Your exported PDFs will appear here!</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export History</Text>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#2563EB' },
  list: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  icon: { width: 32, height: 32, marginRight: 12 },
  info: { flex: 1 },
  filename: { fontWeight: 'bold', color: '#1F2937' },
  meta: { color: '#6B7280', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { marginLeft: 8 },
  actionText: { color: '#2563EB', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#6B7280', fontSize: 16, textAlign: 'center', marginTop: 32 },
}); 