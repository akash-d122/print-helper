import React, { useState, useRef } from 'react';
import { View, Button, Image, StyleSheet, Text, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';

const scannerHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenCV Document Scanner</title>
    <script src="https://docs.opencv.org/4.5.2/opencv.js" async></script>
    <style>
        body, html { margin: 0; padding: 0; font-family: sans-serif; background-color: #f0f0f0; color: #333; }
        .container { padding: 10px; text-align: center; }
        .status { font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <p class="status">OpenCV.js Status: <span id="status">Loading...</span></p>
    </div>
    <canvas id="outputCanvas" style="display: none;"></canvas>

    <script>
        const statusEl = document.getElementById('status');
        
        cv.onRuntimeInitialized = () => {
            statusEl.textContent = 'Ready.';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
        };

        document.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.type === 'PROCESS_IMAGE') {
                processImage(message.payload.base64);
            }
        });

        function processImage(base64) {
            statusEl.textContent = 'Processing...';
            const img = new Image();
            img.onload = () => {
                try {
                    const src = cv.imread(img);
                    let processedMat = new cv.Mat();
                    
                    let gray = new cv.Mat();
                    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
                    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

                    let canny = new cv.Mat();
                    cv.Canny(gray, canny, 50, 100, 3, false);

                    let contours = new cv.MatVector();
                    let hierarchy = new cv.Mat();
                    cv.findContours(canny, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

                    let largestArea = 0;
                    let largestContour = null;
                    for (let i = 0; i < contours.size(); ++i) {
                        let contour = contours.get(i);
                        let area = cv.contourArea(contour, false);
                        if (area > largestArea) {
                            let peri = cv.arcLength(contour, true);
                            let approx = new cv.Mat();
                            cv.approxPolyDP(contour, approx, 0.02 * peri, true);
                            if (approx.rows === 4) {
                                largestArea = area;
                                largestContour = approx;
                            } else {
                                approx.delete();
                            }
                        }
                        contour.delete();
                    }

                    if (largestContour) {
                        const points = [];
                        for(let i=0; i < largestContour.rows; i++) {
                            points.push({x: largestContour.data32S[i*2], y: largestContour.data32S[i*2+1]});
                        }
                        
                        points.sort((a, b) => a.y - b.y);
                        const [pt1, pt2] = points.slice(0, 2).sort((a, b) => a.x - b.x);
                        const [pt3, pt4] = points.slice(2, 4).sort((a, b) => a.x - b.x);
                        const corners = [pt1, pt2, pt4, pt3];

                        const w1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
                        const w2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
                        const h1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
                        const h2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
                        const maxWidth = Math.max(w1, w2);
                        const maxHeight = Math.max(h1, h2);

                        const destCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1]);
                        const srcCorners = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flatMap(p => [p.x, p.y]));

                        const M = cv.getPerspectiveTransform(srcCorners, destCorners);
                        cv.warpPerspective(src, processedMat, M, new cv.Size(maxWidth, maxHeight));
                        cv.cvtColor(processedMat, processedMat, cv.COLOR_RGBA2GRAY, 0);

                        srcCorners.delete(); destCorners.delete(); M.delete();
                    } else {
                        cv.cvtColor(src, processedMat, cv.COLOR_RGBA2GRAY, 0);
                    }
                    
                    const canvas = document.getElementById('outputCanvas');
                    cv.imshow(canvas, processedMat);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'PROCESSED_IMAGE',
                        payload: { base64: canvas.toDataURL('image/png', 0.9) }
                    }));

                    src.delete(); processedMat.delete(); gray.delete(); canny.delete(); contours.delete(); hierarchy.delete();
                    if (largestContour) largestContour.delete();

                    statusEl.textContent = 'Done.';
                } catch (err) {
                    statusEl.textContent = 'Error: ' + err.message;
                     window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: err.message }));
                }
            };
            img.src = 'data:image/jpeg;base64,' + base64;
        }
    </script>
</body>
</html>
`;

export default function DocumentScanner() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const webViewRef = useRef(null);
    const [isWebViewReady, setIsWebViewReady] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
            setProcessedImage(null);
            setIsProcessing(true);
            const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            if (isWebViewReady && webViewRef.current) {
                 webViewRef.current.postMessage(JSON.stringify({
                    type: 'PROCESS_IMAGE',
                    payload: { base64 }
                }));
            }
        }
    };

    const handleWebViewMessage = (event) => {
        const message = JSON.parse(event.nativeEvent.data);
        switch (message.type) {
            case 'READY':
                setIsWebViewReady(true);
                break;
            case 'PROCESSED_IMAGE':
                setProcessedImage(message.payload.base64);
                setIsProcessing(false);
                break;
            case 'ERROR':
                console.error('WebView Error:', message.payload);
                setIsProcessing(false);
                break;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    originWhitelist={['*']}
                    source={{ html: scannerHtml }}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled
                    domStorageEnabled
                />
            </View>
            <Button title="Pick an Image" onPress={pickImage} disabled={!isWebViewReady} />
            {isProcessing && <ActivityIndicator size="large" color="#0000ff" />}

            <View style={styles.imagesContainer}>
                {selectedImage && (
                    <View style={styles.imageBox}>
                        <Text style={styles.imageLabel}>Original</Text>
                        <Image source={{ uri: selectedImage }} style={styles.image} />
                    </View>
                )}
                {processedImage && (
                    <View style={styles.imageBox}>
                        <Text style={styles.imageLabel}>Scanned</Text>
                        <Image source={{ uri: processedImage }} style={styles.image} />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    webviewContainer: {
        width: '100%',
        height: 50, // Minimal height to show status, can be 0 if not needed
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 10,
    },
    imagesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    imageBox: {
        alignItems: 'center',
    },
    image: {
        width: 150,
        height: 200,
        resizeMode: 'contain',
        borderWidth: 1,
        borderColor: '#999',
    },
    imageLabel: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
}); 