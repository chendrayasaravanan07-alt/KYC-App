import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fileUploadService } from '../services/api';

const { width, height } = Dimensions();

const CameraScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef();

  const { documentType, onCaptureComplete } = route.params || {};

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      Vibration.vibrate(100);

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: false,
        });

        setCapturedImage(photo.uri);
        Vibration.vibrate(200);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const handleCaptureComplete = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'No image captured');
      return;
    }

    try {
      setIsProcessing(true);
      setUploadProgress(0);

      // Validate image first
      const validation = await fileUploadService.validateImage(capturedImage);
      if (!validation.success) {
        Alert.alert('Validation Error', validation.error);
        setIsProcessing(false);
        return;
      }

      // Upload the image with progress tracking
      const result = await fileUploadService.uploadFile(
        capturedImage,
        documentType,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        Vibration.vibrate(300);
        Alert.alert(
          'Success',
          `${documentType} uploaded successfully!`,
          [
            { text: 'OK', onPress: () => handleSuccess() },
            { text: 'Take Another', onPress: () => handleRetake() }
          ]
        );
      } else {
        Alert.alert('Upload Failed', result.error);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleSuccess = () => {
    setCapturedImage(null);
    if (onCaptureComplete) {
      onCaptureComplete();
    } else {
      navigation.goBack();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setUploadProgress(0);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  const toggleFlashMode = () => {
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.on
        : Camera.Constants.FlashMode.off
    );
  };

  const renderCamera = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.permissionText}>No access to camera</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => Linking.openURL('app-settings:')}
          >
            <Text style={styles.permissionButtonText}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (capturedImage) {
      return (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={handleRetake}
              disabled={isProcessing}
            >
              <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.previewButtonText}>Retake</Text>
            </TouchableOpacity>

            <View style={styles.uploadProgress}>
              {isProcessing && (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.progressText}>
                    {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...'}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.previewButton,
                styles.acceptButton,
                isProcessing && styles.disabledButton
              ]}
              onPress={handleCaptureComplete}
              disabled={isProcessing}
            >
              <MaterialIcons name="check" size={24} color="#FFFFFF" />
              <Text style={styles.previewButtonText}>
                {isProcessing ? 'Processing...' : 'Accept'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewImageContainer}>
            <Image
              source={{ uri: capturedImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          flashMode={flashMode}
          onCameraReady={() => setIsCameraReady(true)}
          ratio={'4:3'}
        >
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFlashMode}
            >
              <MaterialIcons
                name={flashMode === Camera.Constants.FlashMode.on ? 'flash-on' : 'flash-off'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.centerControls}>
            <TouchableOpacity
              style={[styles.captureButton, !isCameraReady && styles.disabledButton]}
              onPress={takePicture}
              disabled={!isCameraReady}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={pickImage}
            >
              <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraType}
            >
              <MaterialIcons
                name={cameraType === Camera.Constants.Type.back ? 'camera-rear' : 'camera-front'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.documentTypeIndicator}>
              <Text style={styles.documentTypeText}>
                {documentType?.toUpperCase() || 'DOCUMENT'}
              </Text>
            </View>
          </View>
        </Camera>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={true}
      />
      {renderCamera()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    width: width,
    height: height * 0.75,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Camera controls
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  centerControls: {
    position: 'absolute',
    bottom: height * 0.35,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  bottomControls: {
    position: 'absolute',
    bottom: height * 0.15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  documentTypeIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  documentTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Preview screen
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  previewButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  uploadProgress: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: width * 0.9,
    height: height * 0.6,
    borderRadius: 8,
  },
});

export default CameraScreen;