import OpenCV from 'react-native-opencv3';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import { ToastAndroid } from 'react-native';

export async function applyFilters(imageUri, filterType) {
  if (filterType === 'reset') {
    return imageUri;
  }
  try {
    let mat = await OpenCV.imreadAsync(imageUri);
    if (filterType === 'bw') {
      await OpenCV.cvtColorAsync(mat, mat, OpenCV.COLOR_RGBA2GRAY);
      await OpenCV.thresholdAsync(mat, mat, 128, 255, OpenCV.THRESH_BINARY);
    } else if (filterType === 'grayscale') {
      await OpenCV.cvtColorAsync(mat, mat, OpenCV.COLOR_RGBA2GRAY);
    } else if (filterType === 'contrast') {
      await OpenCV.cvtColorAsync(mat, mat, OpenCV.COLOR_RGBA2GRAY);
      await OpenCV.equalizeHistAsync(mat, mat);
    }
    // Save to cache
    const filteredUri = FileSystem.cacheDirectory + 'filter_' + filterType + '_' + uuidv4() + '.jpg';
    await FileSystem.writeAsStringAsync(filteredUri, mat, { encoding: FileSystem.EncodingType.Base64 });
    return filteredUri;
  } catch (e) {
    ToastAndroid.show('Filter failed', ToastAndroid.SHORT);
    return imageUri;
  }
} 