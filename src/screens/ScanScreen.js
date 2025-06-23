import React, { useState, useRef, useEffect } from 'react';
import { View, Button, Image, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Animated, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { createPDF } from '../services/PDFService';

const SCANS_DIR = FileSystem.cacheDirectory + 'scans/';

// Helper to ensure scan directory exists
async function ensureScanDir() {
    const dirInfo = await FileSystem.getInfoAsync(SCANS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(SCANS_DIR, { intermediates: true });
    }
}

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
        #filterContainer { margin-top: 10px; }
        .filter-btn { padding: 5px 10px; margin: 0 5px; border: 1px solid #ccc; background: #fff; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <p class="status">OpenCV.js Status: <span id="status">Loading...</span></p>
         <div id="filterContainer">
            <button class="filter-btn" onclick="applyFilter('none')">Original</button>
            <button class="filter-btn" onclick="applyFilter('gray')">Grayscale</button>
            <button class="filter-btn" onclick="applyFilter('contrast')">Contrast</button>
        </div>
    </div>
    <canvas id="outputCanvas" style="display: none;"></canvas>

    <script>
        const statusEl = document.getElementById('status');
        let originalBase64 = null;
        
        cv.onRuntimeInitialized = () => {
            statusEl.textContent = 'Ready.';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
        };

        document.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.type === 'PROCESS_IMAGE') {
                originalBase64 = message.payload.base64;
                processImage(originalBase64);
            }
        });

        function applyFilter(filter) {
            if (!originalBase64) return;
            processImage(originalBase64, filter);
        }

        function processImage(base64, filter = 'none') {
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
                        if (area > 1000) {
                            let peri = cv.arcLength(contour, true);
                            let approx = new cv.Mat();
                            cv.approxPolyDP(contour, approx, 0.02 * peri, true);
                            if (approx.rows === 4) {
                                largestArea = area;
                                largestContour = approx.clone();
                            }
                            approx.delete();
                        }
                        contour.delete();
                    }

                    if (largestContour) {
                        // Perspective transform logic
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
                        srcCorners.delete(); destCorners.delete(); M.delete();
                    } else {
                        src.copyTo(processedMat); // Use original if no contour found
                    }
                    
                    // Apply selected filter
                    if (filter === 'gray') {
                        cv.cvtColor(processedMat, processedMat, cv.COLOR_RGBA2GRAY, 0);
                    } else if (filter === 'contrast') {
                         cv.cvtColor(processedMat, processedMat, cv.COLOR_RGBA2GRAY, 0); // Must be grayscale for equalizeHist
                         cv.equalizeHist(processedMat, processedMat);
                    }

                    const canvas = document.getElementById('outputCanvas');
                    cv.imshow(canvas, processedMat);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'PROCESSED_IMAGE',
                        payload: { base64: canvas.toDataURL('image/jpeg', 0.9) }
                    }));

                    src.delete(); processedMat.delete(); gray.delete(); canny.delete(); contours.delete(); hierarchy.delete();
                    if (largestContour) largestContour.delete();

                    statusEl.textContent = 'Done.';
                } catch (err) {
                    statusEl.textContent = 'Error: ' + err.message;
                     window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', payload: err.message }));
                }
            };
            img.src = base64;
        }
    </script>
</body>
</html>
`;

// Simple Toast component
const Toast = ({ message, visible, onHide }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(2000),
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start(() => onHide && onHide());
        }
    }, [visible, fadeAnim, onHide]);
    
    if (!visible) return null;

    return (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
};


export default function ScanScreen() {
    const [scannedImages, setScannedImages] = useState([]);
    const [processedImage, setProcessedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const webViewRef = useRef(null);
    const [isWebViewReady, setIsWebViewReady] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '' });

    useEffect(() => {
        ensureScanDir();
    }, []);

    const showToast = (message) => setToast({ visible: true, message });

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaType.Images,
            allowsEditing: false,
            quality: 1,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setProcessedImage(null);
            if (isWebViewReady && webViewRef.current) {
                setIsProcessing(true);
                webViewRef.current.postMessage(JSON.stringify({
                    type: 'PROCESS_IMAGE',
                    payload: { base64: `data:image/jpeg;base64,${asset.base64}` }
                }));
            } else {
                showToast("Scanner is not ready yet.");
            }
        }
    };
    
    const saveAndAddNewScan = async () => {
        if (!processedImage) return;
        const filename = `scan_${Date.now()}.jpg`;
        const fileUri = SCANS_DIR + filename;
        const base64Data = processedImage.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
        });
        setScannedImages([...scannedImages, fileUri]);
        setProcessedImage(null); // Clear preview for next scan
        showToast('Page added!');
    };

    const createBatchPDF = async () => {
        if (scannedImages.length === 0) return;
        setIsProcessing(true);
        try {
            const pdfPath = await createPDF(scannedImages);
            await Sharing.shareAsync(pdfPath);
            await FileSystem.deleteAsync(SCANS_DIR, { idempotent: true });
            setScannedImages([]);
        } catch(e) {
            console.error(e);
            showToast('Error creating multi-page PDF.');
        } finally {
            setIsProcessing(false);
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
                showToast('An error occurred during scanning.');
                break;
        }
    };

    const renderThumbnail = ({ item }) => (
        <Image source={{ uri: item }} style={styles.thumbnail} />
    );

    return (
        <View style={styles.container}>
            <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
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
            
            <View style={styles.mainContent}>
                {isProcessing && <ActivityIndicator size="large" color="#0000ff" />}
                {!isProcessing && processedImage && (
                    <Image source={{ uri: processedImage }} style={styles.previewImage} />
                )}
            </View>

            <View style={styles.thumbnailContainer}>
                <FlatList
                    data={scannedImages}
                    renderItem={renderThumbnail}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                />
            </View>

            <View style={styles.actionsContainer}>
                <Button title="Scan New Page" onPress={pickImage} disabled={!isWebViewReady || isProcessing} />
                {processedImage && !isProcessing && (
                    <Button title="Add to Batch" onPress={saveAndAddNewScan} />
                )}
                {scannedImages.length > 0 && !isProcessing && (
                    <Button title={`Create PDF (${scannedImages.length})`} onPress={createBatchPDF} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 50,
        backgroundColor: '#fff',
    },
    webviewContainer: {
        width: '100%',
        height: 80,
        borderColor: '#ccc',
        borderWidth: 1,
    },
    mainContent: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    thumbnailContainer: {
        height: 100,
        width: '100%',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    thumbnail: {
        width: 80,
        height: 80,
        resizeMode: 'cover',
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#999',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        padding: 20,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    toastText: {
        color: 'white',
    }
}); 