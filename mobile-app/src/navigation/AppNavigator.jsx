import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import KYCFormScreen from '../screens/KYCFormScreen';
import CameraScreen from '../screens/CameraScreen';
import KYCStatusScreen from '../screens/KYCStatusScreen';
import LivenessDetectionScreen from '../screens/LivenessDetectionScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import KYCDocumentsScreen from '../screens/KYCDocumentsScreen';

// Import utilities
import notificationManager from '../utils/notifications';
import biometricAuth from '../utils/biometricAuth';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
  </Stack.Navigator>
);

// KYC Stack Navigator
const KYCStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="KYCForm" component={KYCFormScreen} options={{ title: 'KYC Form' }} />
    <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Camera' }} />
    <Stack.Screen name="KYCDocuments" component={KYCDocumentsScreen} options={{ title: 'Documents' }} />
    <Stack.Screen name="LivenessDetection" component={LivenessDetectionScreen} options={{ title: 'Liveness Check' }} />
    <Stack.Screen name="KYCStatus" component={KYCStatusScreen} options={{ title: 'KYC Status' }} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'KYC':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Status':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          height: Platform.OS === 'ios' ? 80 : 60,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA',
        },
        headerTintColor: '#1C1C1E',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="KYC"
        component={KYCStack}
        options={{
          title: 'KYC',
          headerShown: false,
          tabBarButton: () => null, // Hide from tab bar since it has its own stack
        }}
      />
      <Tab.Screen
        name="Status"
        component={KYCStatusScreen}
        options={{
          title: 'Status',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);

      // Initialize notifications
      await notificationManager.initialize();

      // Initialize biometric authentication
      await biometricAuth.initialize();

      // Check if user is authenticated (you might want to check token here)
      const token = await AsyncStorage.getItem('authToken');
      setIsAuthenticated(!!token);

      // Try auto-authenticate with biometrics if enabled
      if (token && await biometricAuth.isEnabled()) {
        const result = await biometricAuth.autoAuthenticate();
        if (result.success) {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </LinearGradient>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Platform.OS === 'ios' ? '#FFFFFF' : '#007AFF'}
        translucent={false}
      />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="KYCStack" component={KYCStack} options={{ title: 'KYC Verification' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;