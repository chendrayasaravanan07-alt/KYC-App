import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

// Auth Context
const AuthContext = createContext();

// Initial state
const initialState = {
  isLoading: true,
  isSignout: false,
  userToken: null,
  user: null,
  isAuthenticated: false,
  error: null,
};

// Auth reducer
const authReducer = (prevState, action) => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...prevState,
        userToken: action.token,
        user: action.user,
        isAuthenticated: !!action.token,
        isLoading: false,
      };
    case 'SIGN_IN':
      return {
        ...prevState,
        isSignout: false,
        userToken: action.token,
        user: action.user,
        isAuthenticated: true,
        error: null,
      };
    case 'SIGN_OUT':
      return {
        ...prevState,
        isSignout: true,
        userToken: null,
        user: null,
        isAuthenticated: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...prevState,
        error: action.error,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...prevState,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...prevState,
        user: { ...prevState.user, ...action.user },
      };
    default:
      return prevState;
  }
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Get stored auth data
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUser = await AsyncStorage.getItem('userProfile');

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);

          // Validate token with backend (optional)
          try {
            const profileResult = await authService.getProfile();
            if (profileResult.success) {
              dispatch({
                type: 'RESTORE_TOKEN',
                token: storedToken,
                user: profileResult.user || user,
              });
            } else {
              // Token is invalid, clear storage
              await AsyncStorage.multiRemove(['authToken', 'userProfile']);
              dispatch({ type: 'SIGN_OUT' });
            }
          } catch (error) {
            // Network error, restore from storage
            dispatch({
              type: 'RESTORE_TOKEN',
              token: storedToken,
              user: user,
            });
          }
        } else {
          dispatch({ type: 'SIGN_OUT' });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: 'SIGN_OUT' });
      }
    };

    bootstrapAsync();
  }, []);

  // Sign in function
  const signIn = async (credentials) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await authService.login(credentials);

      if (result.success) {
        const { token, user } = result.data;

        // Store in AsyncStorage
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userProfile', JSON.stringify(user));

        dispatch({
          type: 'SIGN_IN',
          token,
          user,
        });

        return { success: true };
      } else {
        dispatch({
          type: 'SET_ERROR',
          error: result.error || 'Login failed',
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error occurred';
      dispatch({
        type: 'SET_ERROR',
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Sign up function
  const signUp = async (userData) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });

      const result = await authService.register(userData);

      if (result.success) {
        const { token, user } = result.data;

        // Store in AsyncStorage
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('userProfile', JSON.stringify(user));

        dispatch({
          type: 'SIGN_IN',
          token,
          user,
        });

        return { success: true };
      } else {
        dispatch({
          type: 'SET_ERROR',
          error: result.error || 'Registration failed',
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error occurred';
      dispatch({
        type: 'SET_ERROR',
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // Call logout API (optional)
      await authService.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear storage
      await AsyncStorage.multiRemove(['authToken', 'userProfile', 'biometricEnabled', 'notificationsEnabled']);

      dispatch({ type: 'SIGN_OUT' });
    }
  };

  // Update user profile
  const updateUser = async (userData) => {
    try {
      const result = await authService.updateProfile(userData);

      if (result.success) {
        const updatedUser = { ...state.user, ...result.user };

        // Update storage
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));

        dispatch({
          type: 'UPDATE_USER',
          user: result.user,
        });

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const result = await authService.getProfile();

      if (result.success) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(result.user));

        dispatch({
          type: 'UPDATE_USER',
          user: result.user,
        });

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (token) {
        const result = await authService.getProfile();

        if (result.success) {
          dispatch({
            type: 'UPDATE_USER',
            user: result.user,
          });
          return true;
        } else {
          // Token invalid
          await signOut();
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      return false;
    }
  };

  // Context value
  const authContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    updateUser,
    clearError,
    refreshUser,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, AuthContext, useAuth };