import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingOverlay = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#2563EB" />
    <Text style={styles.text}>Loading...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#2563EB',
  },
});

export default LoadingOverlay; 