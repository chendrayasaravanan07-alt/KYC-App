import React, { createContext, useContext, useState, useEffect } from 'react';
import { AsyncStorage } from '@react-native-async-storage/async-storage';
import {
  DefaultTheme as NavigationLightTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

// Theme Context
const ThemeContext = createContext();

// Light theme
const lightTheme = {
  dark: false,
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    accent: '#FF9500',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    background: '#FFFFFF',
    surface: '#F8F8F8',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    border: '#E5E5EA',
    divider: '#F2F2F7',
    placeholder: '#C7C7CC',
    disabled: '#E5E5EA',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    h5: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    body1: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    overline: {
      fontSize: 10,
      fontWeight: '600',
      lineHeight: 14,
      textTransform: 'uppercase',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  navigation: {
    ...NavigationLightTheme,
    colors: {
      ...NavigationLightTheme.colors,
      primary: '#007AFF',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#1C1C1E',
      border: '#E5E5EA',
      notification: '#FF3B30',
    },
  },
};

// Dark theme
const darkTheme = {
  dark: true,
  colors: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    accent: '#FF9F0A',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',
    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#8E8E93',
    border: '#38383A',
    divider: '#38383A',
    placeholder: '#8E8E93',
    disabled: '#38383A',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
  shadows: {
    ...lightTheme.shadows,
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  navigation: {
    ...NavigationDarkTheme,
    colors: {
      ...NavigationDarkTheme.colors,
      primary: '#0A84FF',
      background: '#000000',
      card: '#2C2C2E',
      text: '#FFFFFF',
      border: '#38383A',
      notification: '#FF453A',
    },
  },
};

// Theme Provider Component
const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState(lightTheme);

  // Initialize theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('themeMode');
        const darkMode = storedTheme === 'dark';
        setIsDarkMode(darkMode);
        setTheme(darkMode ? darkTheme : lightTheme);
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    loadTheme();
  }, []);

  // Toggle theme
  const toggleTheme = async () => {
    try {
      const newDarkMode = !isDarkMode;
      setIsDarkMode(newDarkMode);
      setTheme(newDarkMode ? darkTheme : lightTheme);

      // Save preference
      await AsyncStorage.setItem('themeMode', newDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  };

  // Set theme programmatically
  const setThemeMode = async (mode) => {
    try {
      const darkMode = mode === 'dark';
      setIsDarkMode(darkMode);
      setTheme(darkMode ? darkTheme : lightTheme);

      // Save preference
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  // Get color utility
  const getColor = (colorName) => {
    return theme.colors[colorName] || theme.colors.text;
  };

  // Get spacing utility
  const getSpacing = (size) => {
    return theme.spacing[size] || theme.spacing.md;
  };

  // Get typography utility
  const getTypography = (style) => {
    return theme.typography[style] || theme.typography.body1;
  };

  // Context value
  const themeContextValue = {
    theme,
    isDarkMode,
    toggleTheme,
    setThemeMode,
    getColor,
    getSpacing,
    getTypography,
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { ThemeProvider, ThemeContext, useTheme, lightTheme, darkTheme };