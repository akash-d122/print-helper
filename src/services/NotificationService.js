import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ToastAndroid, Alert } from 'react-native';

export async function initNotifications() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: reqStatus } = await Notifications.requestPermissionsAsync();
    if (reqStatus !== 'granted') {
      if (Platform.OS === 'android') ToastAndroid.show('Notifications permission denied', ToastAndroid.SHORT);
      else Alert.alert('Notifications permission denied');
      return false;
    }
  }
  return true;
}

export async function sendExportCompleteNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Export Complete 🎉',
        body: 'Your batch PDF export finished successfully.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch (e) {
    if (Platform.OS === 'android') ToastAndroid.show('Failed to send notification', ToastAndroid.SHORT);
  }
} 