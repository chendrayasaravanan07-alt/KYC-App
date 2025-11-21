import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const userInfo = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 9876543210',
    kycStatus: 'In Review',
    kycStatusColor: '#FF9500',
    memberSince: 'January 2024',
    verificationLevel: 'Advanced',
  };

  const settingsOptions = [
    {
      id: 'personal_info',
      title: 'Personal Information',
      subtitle: 'Update your profile details',
      icon: 'person',
      onPress: () => Alert.alert('Coming Soon', 'Personal information update coming soon'),
    },
    {
      id: 'security',
      title: 'Security Settings',
      subtitle: 'Password and authentication',
      icon: 'lock-closed',
      onPress: () => Alert.alert('Coming Soon', 'Security settings coming soon'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage notifications preferences',
      icon: 'notifications',
      toggle: true,
      value: notificationsEnabled,
      onToggle: setNotificationsEnabled,
    },
    {
      id: 'biometric',
      title: 'Biometric Authentication',
      subtitle: 'Use fingerprint or Face ID',
      icon: 'finger-print',
      toggle: true,
      value: biometricEnabled,
      onToggle: setBiometricEnabled,
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      subtitle: 'Control your data and privacy',
      icon: 'shield-checkmark',
      onPress: () => Alert.alert('Coming Soon', 'Privacy settings coming soon'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'help-circle',
      onPress: () => Alert.alert('Help', 'Contact us at support@kycapp.com'),
    },
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version and information',
      icon: 'information-circle',
      onPress: () => Alert.alert('About', 'KYC App v1.0.0\nAI-Driven Verification System'),
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userProfile');
            // Navigate to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const handleSettingToggle = async (optionId, newValue) => {
    // Handle biometric authentication toggle
    if (optionId === 'biometric' && newValue) {
      // This would trigger biometric enrollment
      Alert.alert(
        'Enable Biometric Authentication',
        'Would you like to enable fingerprint or Face ID authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => {
              // Store preference
              AsyncStorage.setItem('biometricEnabled', 'true');
              setBiometricEnabled(true);
              Alert.alert('Success', 'Biometric authentication enabled successfully');
            },
          },
        ]
      );
    } else if (optionId === 'biometric' && !newValue) {
      // Disable biometric authentication
      AsyncStorage.setItem('biometricEnabled', 'false');
      setBiometricEnabled(false);
    }

    // Handle notifications toggle
    if (optionId === 'notifications') {
      AsyncStorage.setItem('notificationsEnabled', newValue.toString());
      setNotificationsEnabled(newValue);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100x100/007AFF/FFFFFF?text=JD' }}
              style={styles.avatar}
            />
            <View style={styles.avatarBadge}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.userName}>{userInfo.name}</Text>
          <Text style={styles.userEmail}>{userInfo.email}</Text>
          <View style={styles.kycStatusContainer}>
            <View style={[styles.kycBadge, { backgroundColor: userInfo.kycStatusColor + '15' }]}>
              <View style={[styles.kycIndicator, { backgroundColor: userInfo.kycStatusColor }]} />
              <Text style={[styles.kycStatus, { color: userInfo.kycStatusColor }]}>
                KYC: {userInfo.kycStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>A+</Text>
            <Text style={styles.statLabel}>Verification</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{userInfo.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userInfo.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userInfo.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{userInfo.memberSince}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoLabel}>Verification Level</Text>
              <Text style={styles.infoValue}>{userInfo.verificationLevel}</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsCard}>
            {settingsOptions.map((option) => (
              <View key={option.id} style={styles.settingRow}>
                <TouchableOpacity
                  style={styles.settingContent}
                  onPress={option.onPress}
                  disabled={option.toggle}
                >
                  <View style={[styles.settingIcon, { backgroundColor: '#F2F2F7' }]}>
                    <Ionicons name={option.icon} size={20} color="#007AFF" />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                  </View>
                  {option.toggle ? (
                    <Switch
                      value={option.value}
                      onValueChange={(newValue) => handleSettingToggle(option.id, newValue)}
                      trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                      thumbColor={option.value ? '#FFFFFF' : '#FFFFFF'}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.dangerCard}>
            <TouchableOpacity
              style={[styles.dangerButton, { marginBottom: 12 }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={20} color="#FF3B30" />
              <Text style={styles.dangerButtonText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => Alert.alert('Coming Soon', 'Account deletion feature coming soon')}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
              <Text style={styles.dangerButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 KYC App. All rights reserved.</Text>
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

  // Profile Header
  profileHeader: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F2F2F7',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 12,
  },
  kycStatusContainer: {
    alignItems: 'center',
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
  },
  kycIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
    marginRight: 6,
  },
  kycStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
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

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoRow:lastChild: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
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

  // Danger Zone
  dangerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
  },
});

export default ProfileScreen;