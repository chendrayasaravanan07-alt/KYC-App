import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

class BiometricAuth {
  constructor() {
    this.isSupported = false;
    this.availableBiometrics = [];
    this.enrolledBiometrics = [];
  }

  // Initialize biometric authentication
  async initialize() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        console.log('Biometric authentication not supported on this device');
        return false;
      }

      const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      this.availableBiometrics = biometricTypes;
      this.isSupported = true;

      console.log('Biometric authentication supported:', biometricTypes);
      return true;
    } catch (error) {
      console.error('Error initializing biometric auth:', error);
      return false;
    }
  }

  // Check if biometrics are enrolled
  async isEnrolled() {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      this.enrolledBiometrics = enrolled ? this.availableBiometrics : [];
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric enrollment:', error);
      return false;
    }
  }

  // Get available biometric types
  getBiometricTypes() {
    return this.availableBiometrics.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris Scanner';
        default:
          return 'Biometric';
      }
    });
  }

  // Get user-friendly biometric name
  getBiometricName() {
    if (!this.availableBiometrics.length) return null;

    const types = this.getBiometricTypes();

    if (Platform.OS === 'ios') {
      if (types.includes('Face ID')) return 'Face ID';
      if (types.includes('Fingerprint')) return 'Touch ID';
    } else {
      if (types.includes('Fingerprint')) return 'Fingerprint';
    }

    return types[0] || 'Biometric Authentication';
  }

  // Authenticate with biometrics
  async authenticate(options = {}) {
    const {
      promptMessage = 'Authenticate to continue',
      fallbackLabel = 'Use Passcode',
      cancelLabel = 'Cancel',
      disableDeviceFallback = false,
    } = options;

    try {
      if (!this.isSupported) {
        throw new Error('Biometric authentication not supported');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel,
        cancelLabel,
        disableDeviceFallback,
        biometricSecurityLevel: LocalAuthentication.SecurityLevel.STRONG,
      });

      return result;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Authenticate with optional fallback to device passcode
  async authenticateWithFallback(promptMessage = 'Authenticate to continue') {
    try {
      const result = await this.authenticate({
        promptMessage,
        disableDeviceFallback: false,
      });

      if (!result.success && result.error === 'User canceled') {
        return { success: false, canceled: true };
      }

      return result;
    } catch (error) {
      console.error('Authentication with fallback error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if biometric authentication is available and enrolled
  async isAvailable() {
    return this.isSupported && await this.isEnrolled();
  }

  // Enable biometric authentication for the app
  async enableBiometricAuth(pinCode) {
    try {
      // First, verify the user's PIN
      if (pinCode) {
        const storedPin = await AsyncStorage.getItem('userPin');
        if (storedPin !== pinCode) {
          throw new Error('Invalid PIN');
        }
      }

      // Test biometric authentication
      const result = await this.authenticate({
        promptMessage: 'Enable biometric authentication',
      });

      if (result.success) {
        await AsyncStorage.setItem('biometricEnabled', 'true');
        await AsyncStorage.setItem('biometricType', this.getBiometricName());
        return { success: true };
      } else {
        throw new Error(result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return { success: false, error: error.message };
    }
  }

  // Disable biometric authentication
  async disableBiometricAuth(pinCode) {
    try {
      // Verify the user's PIN
      if (pinCode) {
        const storedPin = await AsyncStorage.getItem('userPin');
        if (storedPin !== pinCode) {
          throw new Error('Invalid PIN');
        }
      }

      await AsyncStorage.removeItem('biometricEnabled');
      await AsyncStorage.removeItem('biometricType');
      return { success: true };
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if biometric authentication is enabled
  async isEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  // Get stored biometric type
  async getBiometricType() {
    try {
      return await AsyncStorage.getItem('biometricType');
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return null;
    }
  }

  // Auto-authenticate if biometrics are enabled
  async autoAuthenticate() {
    try {
      const enabled = await this.isEnabled();
      if (!enabled) {
        return { success: false, reason: 'Biometric authentication not enabled' };
      }

      const available = await this.isAvailable();
      if (!available) {
        return { success: false, reason: 'Biometric authentication not available' };
      }

      const biometricType = await this.getBiometricType();
      const promptMessage = `Authenticate with ${biometricType || 'biometrics'}`;

      return await this.authenticate({
        promptMessage,
      });
    } catch (error) {
      console.error('Auto-authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Prompt user to enable biometric authentication
  async promptEnableBiometric() {
    try {
      const available = await this.isAvailable();
      if (!available) {
        Alert.alert(
          'Biometric Authentication',
          'Biometric authentication is not available on this device.',
          [{ text: 'OK' }]
        );
        return { success: false, reason: 'not_available' };
      }

      return new Promise((resolve) => {
        Alert.alert(
          'Enable Biometric Authentication',
          `Use ${this.getBiometricName()} for quick and secure access to your account?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => resolve({ success: false, reason: 'user_declined' }),
            },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  const result = await this.enableBiometricAuth();
                  if (result.success) {
                    Alert.alert(
                      'Success',
                      `${this.getBiometricName()} has been enabled for your account.`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    Alert.alert(
                      'Error',
                      result.error || 'Failed to enable biometric authentication.',
                      [{ text: 'OK' }]
                    );
                  }
                  resolve(result);
                } catch (error) {
                  Alert.alert(
                    'Error',
                    'Failed to enable biometric authentication.',
                    [{ text: 'OK' }]
                  );
                  resolve({ success: false, error: error.message });
                }
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('Error prompting biometric enable:', error);
      return { success: false, error: error.message };
    }
  }

  // Show biometric settings screen
  showBiometricSettings() {
    return new Promise((resolve) => {
      Alert.alert(
        'Biometric Authentication',
        'Manage your biometric authentication settings',
        [
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              // This would require PIN verification in a real app
              Alert.alert(
                'Confirmation',
                'Are you sure you want to disable biometric authentication?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await this.disableBiometricAuth();
                        Alert.alert(
                          'Success',
                          'Biometric authentication has been disabled.',
                          [{ text: 'OK' }]
                        );
                        resolve({ action: 'disabled' });
                      } catch (error) {
                        Alert.alert('Error', 'Failed to disable biometric authentication.', [
                          { text: 'OK' }
                        ]);
                        resolve({ action: 'error' });
                      }
                    },
                  },
                ]
              );
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ action: 'cancelled' }),
          },
        ]
      );
    });
  }

  // Get biometric authentication status
  async getStatus() {
    try {
      const enabled = await this.isEnabled();
      const available = await this.isAvailable();
      const type = await this.getBiometricType();

      return {
        supported: this.isSupported,
        available,
        enabled,
        type,
        availableTypes: this.getBiometricTypes(),
      };
    } catch (error) {
      console.error('Error getting biometric status:', error);
      return {
        supported: false,
        available: false,
        enabled: false,
        type: null,
        availableTypes: [],
      };
    }
  }
}

// Create singleton instance
const biometricAuth = new BiometricAuth();

export default biometricAuth;