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
  Animated,
  Easing,
  SafeAreaView,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { livenessService, kycService } from '../services/api';

const { width, height } = Dimensions();

const LivenessDetectionScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [selfieImages, setSelfieImages] = useState([]);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(1));
  const cameraRef = useRef();

  const { onLivenessComplete } = route.params || {};

  const challenges = [
    {
      id: 'blink',
      title: 'Blink Slowly',
      description: 'Blink your eyes slowly 3 times',
      icon: 'eye-off',
      duration: 5000,
      detectAction: 'blink',
    },
    {
      id: 'turn_left',
      title: 'Turn Left',
      description: 'Turn your head to the left',
      icon: 'chevron-back',
      duration: 5000,
      detectAction: 'head_turn_left',
    },
    {
      id: 'turn_right',
      title: 'Turn Right',
      description: 'Turn your head to the right',
      icon: 'chevron-forward',
      duration: 5000,
      detectAction: 'head_turn_right',
    },
    {
      id: 'smile',
      title: 'Smile',
      description: 'Show a natural smile',
      icon: 'happy',
      duration: 5000,
      detectAction: 'smile',
    },
    {
      id: 'neutral',
      title: 'Neutral Face',
      description: 'Keep a neutral expression',
      icon: 'person',
      duration: 5000,
      detectAction: 'neutral',
    },
  ];

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    startLivenessChallenge();
  }, []);

  useEffect(() => {
    if (currentChallenge) {
      startAnimations();
    }
  }, [currentChallenge]);

  const startAnimations = () => {
    // Pulse animation for challenge indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startLivenessChallenge = async () => {
    try {
      setIsProcessing(true);
      const result = await livenessService.startLiveness();

      if (result.success) {
        // Start with the first challenge
        const firstChallenge = challenges[0];
        setCurrentChallenge(firstChallenge);
        setChallengeHistory([]);
        setSelfieImages([]);
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      } else {
        Alert.alert('Error', 'Failed to start liveness detection');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error starting liveness detection:', error);
      Alert.alert('Error', 'Failed to start liveness detection');
      navigation.goBack();
    }
  };

  const captureSelfie = async () => {
    if (!cameraRef.current || !currentChallenge) {
      Alert.alert('Error', 'Camera not ready');
      return null;
    }

    try {
      Vibration.vibrate(100);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
        exif: false,
        skipProcessing: false,
      });

      const imageData = {
        uri: photo.uri,
        base64: photo.base64,
        challenge: currentChallenge.id,
        timestamp: new Date().toISOString(),
        challengeTitle: currentChallenge.title,
      };

      return imageData;
    } catch (error) {
      console.error('Error capturing selfie:', error);
      return null;
    }
  };

  const handleChallengeComplete = async () => {
    if (!currentChallenge) return;

    const selfie = await captureSelfie();
    if (!selfie) {
      Alert.alert('Error', 'Failed to capture image');
      return;
    }

    const newHistory = [...challengeHistory, currentChallenge.id];
    const newImages = [...selfieImages, selfie];

    setChallengeHistory(newHistory);
    setSelfieImages(newImages);

    // Move to next challenge or complete liveness detection
    const nextChallengeIndex = newHistory.length;
    if (nextChallengeIndex < challenges.length) {
      setCurrentChallenge(challenges[nextChallengeIndex]);
    } else {
      await completeLivenessDetection(newImages);
    }
  };

  const completeLivenessDetection = async (images) => {
    try {
      setIsProcessing(true);

      const challengeData = {
        challenges: images.map(img => ({
          challengeId: img.challenge,
          imageData: img.base64,
          timestamp: img.timestamp,
        })),
        metadata: {
          deviceInfo: Platform.OS,
          timestamp: new Date().toISOString(),
          totalChallenges: images.length,
        },
      };

      const result = await livenessService.submitLiveness(challengeData);

      if (result.success) {
        Vibration.vibrate([200, 100, 200]);
        Alert.alert(
          'Liveness Detection Complete',
          'Your liveness verification was successful!',
          [
            { text: 'OK', onPress: () => handleSuccess() }
          ]
        );
      } else {
        Alert.alert(
          'Liveness Detection Failed',
          result.error || 'Failed to verify liveness. Please try again.',
          [
            { text: 'Retry', onPress: () => startLivenessChallenge() },
            { text: 'Cancel', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      console.error('Error completing liveness detection:', error);
      Alert.alert(
        'Error',
        'Failed to complete liveness detection. Please try again.',
        [
          { text: 'Retry', onPress: () => startLivenessChallenge() },
          { text: 'Cancel', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccess = () => {
    if (onLivenessComplete) {
      onLivenessComplete();
    } else {
      navigation.goBack();
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.front
        ? Camera.Constants.Type.back
        : Camera.Constants.Type.front
    );
  };

  const renderChallengeIndicator = () => {
    if (!currentChallenge || isProcessing) return null;

    const progress = (challengeHistory.length / challenges.length) * 100;

    return (
      <Animated.View style={styles.challengeContainer}>
        <View style={styles.challengeHeader}>
          <View style={styles.challengeProgress}>
            <Text style={styles.progressText}>
              Challenge {challengeHistory.length + 1} of {challenges.length}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.challengeContent,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.challengeIcon}>
            <Ionicons
              name={currentChallenge.icon}
              size={48}
              color="#007AFF"
            />
          </View>
          <Text style={styles.challengeTitle}>{currentChallenge.title}</Text>
          <Text style={styles.challengeDescription}>
            {currentChallenge.description}
          </Text>
          <Text style={styles.challengeTimer}>
            You have {currentChallenge.duration / 1000} seconds
          </Text>
        </Animated.View>
      </Animated.View>
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
          <Ionicons name="camera" size={64} color="#8E8E93" />
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

    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          onCameraReady={() => setIsCameraReady(true)}
          ratio={'16:9'}
        />

        {renderChallengeIndicator()}

        {/* Face detection overlay */}
        <View style={styles.faceOverlay}>
          <View style={styles.faceFrame} />
        </View>

        <View style={styles.controls}>
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraType}
            >
              <MaterialIcons
                name={cameraType === Camera.Constants.Type.front ? 'camera-front' : 'camera-rear'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                !isCameraReady && styles.disabledButton,
                isProcessing && styles.disabledButton
              ]}
              onPress={handleChallengeComplete}
              disabled={!isCameraReady || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isProcessing && !currentChallenge) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>
            {currentChallenge ? 'Processing challenge...' : 'Starting liveness detection...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {renderCamera()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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

  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  faceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 250,
    height: 350,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },

  // Controls
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  bottomControls: {
    position: 'absolute',
    bottom: height * 0.15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#8E8E93',
  },

  // Challenge Indicator
  challengeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  challengeHeader: {
    marginBottom: 16,
  },
  challengeProgress: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  challengeContent: {
    alignItems: 'center',
  },
  challengeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  challengeDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  challengeTimer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
  },

  // Processing
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default LivenessDetectionScreen;