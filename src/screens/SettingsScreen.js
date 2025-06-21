import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const EXPORT_BG_KEY = 'exportInBackground';

export default function SettingsScreen() {
  const [exportInBackground, setExportInBackground] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    AsyncStorage.getItem(EXPORT_BG_KEY).then(val => {
      if (val !== null) setExportInBackground(val === 'true');
      setLoading(false);
    });
  }, []);

  const toggleExportInBackground = async () => {
    const newVal = !exportInBackground;
    setExportInBackground(newVal);
    await AsyncStorage.setItem(EXPORT_BG_KEY, newVal ? 'true' : 'false');
    Alert.alert('Setting updated', `Continue export in background: ${newVal ? 'ON' : 'OFF'}`);
  };

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Continue export in background</Text>
        <Switch
          value={exportInBackground}
          onValueChange={toggleExportInBackground}
        />
      </View>
      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('ExportHistory')}>
        <Text style={styles.linkText}>Export History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#2563EB' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 },
  label: { fontSize: 16, color: '#333' },
  linkRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#eee' },
  linkText: { color: '#2563EB', fontSize: 16, fontWeight: 'bold' },
}); 