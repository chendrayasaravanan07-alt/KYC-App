import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { notificationService } from '../services/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationManager {
  constructor() {
    this.pushToken = null;
    this.isInitialized = false;
    this.notificationListeners = [];
  }

  // Initialize notifications
  async initialize() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        // Create KYC-specific channels
        await Notifications.setNotificationChannelAsync('kyc-updates', {
          name: 'KYC Updates',
          description: 'Updates about your KYC verification status',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('security', {
          name: 'Security',
          description: 'Security alerts and authentication notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 100, 250, 100, 250],
          sound: 'default',
        });
      }

      await this.requestPermissions();
      await this.getPushToken();
      this.setupNotificationListeners();
      this.isInitialized = true;

      console.log('Notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return false;
        }

        return true;
      } else {
        console.log('Must use physical device for push notifications');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get push token
  async getPushToken() {
    try {
      if (Platform.OS === 'android') {
        const { data } = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // Replace with your actual project ID
        });
        this.pushToken = data;
      } else {
        const { data } = await Notifications.getExpoPushTokenAsync();
        this.pushToken = data;
      }

      console.log('Push token:', this.pushToken);

      // Register token with backend
      await this.registerPushToken();
      return this.pushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Register push token with backend
  async registerPushToken() {
    try {
      if (!this.pushToken) return;

      const result = await notificationService.sendPushToken(this.pushToken);
      if (result.success) {
        console.log('Push token registered successfully');
      } else {
        console.log('Failed to register push token:', result.error);
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Handle notification received when app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Handle notification response when user taps notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.notificationListeners.push(foregroundSubscription, responseSubscription);
  }

  // Handle notification received in foreground
  handleNotificationReceived(notification) {
    const { data, title, body } = notification.request.content;

    console.log('Notification received:', { title, body, data });

    // Handle specific notification types
    if (data?.type) {
      this.handleNotificationType(data.type, data);
    }
  }

  // Handle notification response when user taps
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;

    console.log('Notification tapped:', data);

    // Handle navigation based on notification type
    if (data?.type) {
      this.handleNotificationTap(data.type, data);
    }
  }

  // Handle different notification types
  handleNotificationType(type, data) {
    switch (type) {
      case 'kyc_approved':
        this.showKYCApprovedAlert(data);
        break;
      case 'kyc_rejected':
        this.showKYCRejectedAlert(data);
        break;
      case 'kyc_additional_info':
        this.showAdditionalInfoAlert(data);
        break;
      case 'login_attempt':
        this.showSecurityAlert(data);
        break;
      case 'payment_received':
        this.showPaymentAlert(data);
        break;
      default:
        break;
    }
  }

  // Handle notification tap for navigation
  handleNotificationTap(type, data) {
    // This would typically navigate to specific screens
    // Implementation depends on navigation setup
    console.log('Navigate to:', type, data);

    // Example:
    // if (navigationRef.current) {
    //   switch (type) {
    //     case 'kyc_approved':
    //       navigationRef.current.navigate('KYCStatus');
    //       break;
    //     case 'kyc_additional_info':
    //       navigationRef.current.navigate('KYCDocuments');
    //       break;
    //     // ... other cases
    //   }
    // }
  }

  // Show custom alerts for different notification types
  showKYCApprovedAlert(data) {
    Alert.alert(
      'KYC Approved! 🎉',
      'Your KYC verification has been completed successfully.',
      [
        { text: 'View Details', onPress: () => this.handleNotificationTap('kyc_approved', data) },
        { text: 'OK' }
      ]
    );
  }

  showKYCRejectedAlert(data) {
    Alert.alert(
      'KYC Verification Failed',
      'Your KYC verification was not successful. Please check the requirements and try again.',
      [
        { text: 'Review', onPress: () => this.handleNotificationTap('kyc_rejected', data) },
        { text: 'OK' }
      ]
    );
  }

  showAdditionalInfoAlert(data) {
    Alert.alert(
      'Additional Information Required',
      'Please provide additional documents or information to complete your KYC verification.',
      [
        { text: 'Provide Info', onPress: () => this.handleNotificationTap('kyc_additional_info', data) },
        { text: 'Later' }
      ]
    );
  }

  showSecurityAlert(data) {
    Alert.alert(
      'Security Alert',
      'A new login attempt was detected on your account.',
      [
        { text: 'View Activity', onPress: () => this.handleNotificationTap('login_attempt', data) },
        { text: 'OK' }
      ]
    );
  }

  showPaymentAlert(data) {
    Alert.alert(
      'Payment Received',
      `Your payment of ${data.amount} has been processed successfully.`,
      [
        { text: 'View Details', onPress: () => this.handleNotificationTap('payment_received', data) },
        { text: 'OK' }
      ]
    );
  }

  // Send local notification
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Schedule notification
  async scheduleNotification(title, body, trigger, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Cancel scheduled notification
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Get badge count
  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Clear badge count
  async clearBadgeCount() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Get all delivered notifications
  async getDeliveredNotifications() {
    try {
      return await Notifications.getDeliveredNotificationsAsync();
    } catch (error) {
      console.error('Error getting delivered notifications:', error);
      return [];
    }
  }

  // Clear all delivered notifications
  async clearAllDeliveredNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing delivered notifications:', error);
    }
  }

  // KYC-specific notification methods
  async sendKYCStatusUpdate(status, applicationId) {
    const messages = {
      pending: {
        title: 'KYC Application Received',
        body: 'Your KYC application has been received and is being processed.',
      },
      in_review: {
        title: 'KYC Under Review',
        body: 'Your KYC application is currently under review.',
      },
      verified: {
        title: 'KYC Approved! 🎉',
        body: 'Your KYC verification has been completed successfully.',
      },
      rejected: {
        title: 'KYC Verification Failed',
        body: 'Your KYC verification was not successful. Please try again.',
      },
      additional_info_required: {
        title: 'Additional Information Required',
        body: 'Please provide additional information for KYC verification.',
      },
    };

    const message = messages[status];
    if (message) {
      await this.sendLocalNotification(message.title, message.body, {
        type: 'kyc_status_update',
        status,
        applicationId,
      });
    }
  }

  // Security notification methods
  async sendSecurityAlert(type, details) {
    const messages = {
      new_login: {
        title: 'New Login Detected',
        body: 'A new login was detected on your account.',
      },
      password_change: {
        title: 'Password Changed',
        body: 'Your account password has been changed successfully.',
      },
      biometric_disabled: {
        title: 'Biometric Authentication Disabled',
        body: 'Biometric authentication has been disabled for your account.',
      },
    };

    const message = messages[type];
    if (message) {
      await this.sendLocalNotification(message.title, message.body, {
        type: 'security',
        securityType: type,
        ...details,
      });
    }
  }

  // Cleanup listeners
  cleanup() {
    this.notificationListeners.forEach(listener => {
      listener.remove();
    });
    this.notificationListeners = [];
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return {
        granted: settings.granted,
        canAskAgain: settings.canAskAgain,
        status: settings.status,
        ios: settings.ios,
        android: settings.android,
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  // Open notification settings
  async openNotificationSettings() {
    if (Platform.OS === 'ios') {
      try {
        // Open iOS settings
        await Notifications.openAppSettings();
      } catch (error) {
        console.error('Error opening notification settings:', error);
      }
    } else {
      // For Android, user needs to manually go to settings
      Alert.alert(
        'Notification Settings',
        'To manage notification permissions, go to: Settings > Apps > KYC App > Notifications',
        [{ text: 'OK' }]
      );
    }
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager;