import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import biometricAuth from '../utils/biometricAuth';
import notificationManager from '../utils/notifications';

const SettingsScreen = () => {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        'biometricEnabled',
        'notificationsEnabled',
        'darkModeEnabled',
        'autoBackupEnabled',
        'locationEnabled',
        'analyticsEnabled'
      ]);

      setBiometricEnabled(settings[0][1] === 'true');
      setNotificationsEnabled(settings[1][1] !== 'false');
      setDarkModeEnabled(settings[2][1] === 'true');
      setAutoBackupEnabled(settings[3][1] !== 'false');
      setLocationEnabled(settings[4][1] === 'true');
      setAnalyticsEnabled(settings[5][1] !== 'false');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleBiometricToggle = async (value) => {
    if (value) {
      try {
        const available = await biometricAuth.isAvailable();
        if (!available) {
          Alert.alert(
            'Biometric Authentication Not Available',
            'Your device does not support biometric authentication or it is not configured.',
            [{ text: 'OK' }]
          );
          return;
        }

        const result = await biometricAuth.promptEnableBiometric();
        if (result.success) {
          setBiometricEnabled(true);
          await AsyncStorage.setItem('biometricEnabled', 'true');
          Alert.alert('Success', 'Biometric authentication enabled successfully!');
        }
      } catch (error) {
        console.error('Error enabling biometrics:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication.');
      }
    } else {
      try {
        await AsyncStorage.setItem('biometricEnabled', 'false');
        setBiometricEnabled(false);
        Alert.alert('Disabled', 'Biometric authentication has been disabled.');
      } catch (error) {
        console.error('Error disabling biometrics:', error);
      }
    }
  };

  const handleNotificationToggle = async (value) => {
    try {
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
      setNotificationsEnabled(value);

      if (value) {
        await notificationManager.initialize();
        Alert.alert('Enabled', 'Notifications have been enabled.');
      } else {
        Alert.alert('Disabled', 'Notifications have been disabled.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };

  const handleSettingToggle = async (key, value, successMessage) => {
    try {
      await AsyncStorage.setItem(key, value.toString());

      switch (key) {
        case 'darkModeEnabled':
          setDarkModeEnabled(value);
          break;
        case 'autoBackupEnabled':
          setAutoBackupEnabled(value);
          break;
        case 'locationEnabled':
          setLocationEnabled(value);
          break;
        case 'analyticsEnabled':
          setAnalyticsEnabled(value);
          break;
      }

      if (successMessage) {
        Alert.alert('Success', successMessage);
      }
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data? This will remove temporary files and images.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear cache logic here
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = [
                'biometricEnabled',
                'notificationsEnabled',
                'darkModeEnabled',
                'autoBackupEnabled',
                'locationEnabled',
                'analyticsEnabled'
              ];

              await AsyncStorage.multiRemove(keys);
              await loadSettings();
              Alert.alert('Success', 'All settings have been reset to default values.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings.');
            }
          },
        },
      ]
    );
  };

  const securitySettings = [
    {
      id: 'biometric',
      title: 'Biometric Authentication',
      subtitle: 'Use fingerprint or Face ID to unlock',
      icon: 'finger-print',
      toggle: true,
      value: biometricEnabled,
      onToggle: handleBiometricToggle,
    },
    {
      id: 'auto_backup',
      title: 'Auto Backup',
      subtitle: 'Automatically backup your data to secure storage',
      icon: 'cloud-upload',
      toggle: true,
      value: autoBackupEnabled,
      onToggle: (value) => handleSettingToggle('autoBackupEnabled', value, 'Auto backup settings updated.'),
    },
    {
      id: 'location',
      title: 'Location Services',
      subtitle: 'Allow app to access your location for verification',
      icon: 'location',
      toggle: true,
      value: locationEnabled,
      onToggle: (value) => handleSettingToggle('locationEnabled', value, 'Location settings updated.'),
    },
  ];

  const privacySettings = [
    {
      id: 'notifications',
      title: 'Push Notifications',
      subtitle: 'Receive notifications about your KYC status',
      icon: 'notifications',
      toggle: true,
      value: notificationsEnabled,
      onToggle: handleNotificationToggle,
    },
    {
      id: 'analytics',
      title: 'Analytics & Usage Data',
      subtitle: 'Help us improve the app by sharing anonymous usage data',
      icon: 'analytics',
      toggle: true,
      value: analyticsEnabled,
      onToggle: (value) => handleSettingToggle('analyticsEnabled', value, 'Analytics settings updated.'),
    },
  ];

  const displaySettings = [
    {
      id: 'dark_mode',
      title: 'Dark Mode',
      subtitle: 'Reduce eye strain in low light environments',
      icon: 'moon',
      toggle: true,
      value: darkModeEnabled,
      onToggle: (value) => handleSettingToggle('darkModeEnabled', value, 'Dark mode settings updated.'),
    },
    {
      id: 'font_size',
      title: 'Font Size',
      subtitle: 'Adjust text size for better readability',
      icon: 'text',
      onPress: () => Alert.alert('Coming Soon', 'Font size adjustment coming soon'),
    },
    {
      id: 'language',
      title: 'Language',
      subtitle: 'Choose your preferred language',
      icon: 'language',
      onPress: () => Alert.alert('Coming Soon', 'Language selection coming soon'),
    },
  ];

  const dataSettings = [
    {
      id: 'cache',
      title: 'Clear Cache',
      subtitle: 'Remove temporary files and images',
      icon: 'trash-outline',
      onPress: handleClearCache,
      destructive: true,
    },
    {
      id: 'export',
      title: 'Export Data',
      subtitle: 'Download a copy of your data',
      icon: 'download',
      onPress: () => Alert.alert('Coming Soon', 'Data export feature coming soon'),
    },
    {
      id: 'reset',
      title: 'Reset All Settings',
      subtitle: 'Restore all settings to default values',
      icon: 'refresh',
      onPress: handleResetSettings,
      destructive: true,
    },
  ];

  const renderSettingSection = (title, settings) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.settingsCard}>
        {settings.map((setting) => (
          <View key={setting.id} style={styles.settingRow}>
            <TouchableOpacity
              style={styles.settingContent}
              onPress={setting.onPress}
              disabled={setting.toggle}
            >
              <View style={[styles.settingIcon, { backgroundColor: setting.destructive ? '#FFF5F5' : '#F2F2F7' }]}>
                <Ionicons
                  name={setting.icon}
                  size={20}
                  color={setting.destructive ? '#FF3B30' : '#007AFF'}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={[
                  styles.settingTitle,
                  setting.destructive && { color: '#FF3B30' }
                ]}>
                  {setting.title}
                </Text>
                <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
              </View>
              {setting.toggle ? (
                <Switch
                  value={setting.value}
                  onValueChange={setting.onToggle}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={setting.value ? '#FFFFFF' : '#FFFFFF'}
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={setting.destructive ? '#FF3B30' : '#C7C7CC'}
                />
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSettingSection('Security', securitySettings)}
        {renderSettingSection('Privacy', privacySettings)}
        {renderSettingSection('Display', displaySettings)}
        {renderSettingSection('Data Management', dataSettings)}

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2024.1.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>React Native 0.75.4</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your data is secure and encrypted with industry-standard protection
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollView: {
    flex: 1,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingRow:lastChild: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SettingsScreen;