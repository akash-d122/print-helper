import OpenCV from 'react-native-opencv3';
import * as FileSystem from 'expo-file-system';
import { ToastAndroid } from 'react-native';
import * as uuid from 'uuid';

export async function autoCropImage(uri) {
  try {
    const mat = await OpenCV.imreadAsync(uri);
    const grayMat = await OpenCV.cvtColorAsync(mat, 'COLOR_RGBA2GRAY');
    const blurredMat = await OpenCV.GaussianBlurAsync(grayMat, { width: 5, height: 5 }, 0);
    const cannyMat = await OpenCV.CannyAsync(blurredMat, 50, 150);
    
    const contours = await OpenCV.findContoursAsync(cannyMat);
    if (contours.length === 0) {
      throw new Error('No contours found');
    }

    const largestContour = contours.reduce((prev, current) => 
      (current.contourArea > prev.contourArea) ? current : prev
    );

    const { width, height, x, y } = await OpenCV.boundingRectAsync(largestContour.contour);

    const croppedUriBase64 = await OpenCV.cropAsync(uri, x, y, width, height);
    const croppedUri = `${FileSystem.cacheDirectory}crop_${uuid.v4()}.jpg`;
    await FileSystem.writeAsStringAsync(croppedUri, croppedUriBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return croppedUri;
  } catch (e) {
    ToastAndroid.show('Auto crop failed', ToastAndroid.SHORT);
    return uri;
  }
} 