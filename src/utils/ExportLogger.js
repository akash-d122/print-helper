import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

const EXPORT_HISTORY_KEY = 'exportHistory';

export async function addToExportHistory({ fileUri, filename, timestamp }) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const size = fileInfo.exists ? formatBytes(fileInfo.size) : 'Unknown';
    const entry = {
      id: uuidv4(),
      fileUri,
      filename,
      timestamp,
      size,
    };
    const history = await getExportHistory();
    const newHistory = [entry, ...history];
    await AsyncStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(newHistory));
    return entry;
  } catch (e) {
    return null;
  }
}

export async function getExportHistory() {
  const data = await AsyncStorage.getItem(EXPORT_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export async function clearExportHistory() {
  await AsyncStorage.removeItem(EXPORT_HISTORY_KEY);
}

export async function deleteExportFromHistory(id) {
  const history = await getExportHistory();
  const newHistory = history.filter(item => item.id !== id);
  await AsyncStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(newHistory));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 