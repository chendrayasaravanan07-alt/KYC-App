import React, { useRef, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const AnimatedButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  type = 'primary', // primary, secondary, tertiary, danger
  size = 'medium', // small, medium, large
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  loadingText = 'Loading...',
  animated = true,
  rippleEffect = true,
  gradient = false,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (animated && !disabled && !loading) {
      // Subtle pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [animated, disabled, loading, scaleAnim]);

  const handlePressIn = () => {
    if (disabled || loading || !animated) return;

    setIsPressed(true);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading || !animated) return;

    setIsPressed(false);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = (event) => {
    if (disabled || loading) return;
    onPress?.(event);
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLarge);
        break;
      default:
        baseStyle.push(styles.buttonMedium);
    }

    // Type styles
    switch (type) {
      case 'secondary':
        baseStyle.push(styles.buttonSecondary);
        break;
      case 'tertiary':
        baseStyle.push(styles.buttonTertiary);
        break;
      case 'danger':
        baseStyle.push(styles.buttonDanger);
        break;
      default:
        baseStyle.push(styles.buttonPrimary);
    }

    // State styles
    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    }
    if (isPressed) {
      baseStyle.push(styles.buttonPressed);
    }

    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.textSmall);
        break;
      case 'large':
        baseStyle.push(styles.textLarge);
        break;
      default:
        baseStyle.push(styles.textMedium);
    }

    // Type styles
    switch (type) {
      case 'secondary':
        baseStyle.push(styles.textSecondary);
        break;
      case 'tertiary':
        baseStyle.push(styles.textTertiary);
        break;
      case 'danger':
        baseStyle.push(styles.textDanger);
        break;
      default:
        baseStyle.push(styles.textPrimary);
    }

    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  const getGradientColors = () => {
    switch (type) {
      case 'secondary':
        return ['#F8F8F8', '#E5E5EA'];
      case 'tertiary':
        return ['#FFFFFF', '#F0F0F0'];
      case 'danger':
        return ['#FF453A', '#D70015'];
      default:
        return ['#007AFF', '#0056CC'];
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'secondary':
        return '#8E8E93';
      case 'tertiary':
        return '#007AFF';
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const renderContent = () => {
    const content = (
      <>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Ionicons
                name={icon}
                size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
                color={getIconColor()}
                style={styles.iconLeft}
              />
            )}
            <Text style={getTextStyle()}>
              {loading ? loadingText : title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Ionicons
                name={icon}
                size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
                color={getIconColor()}
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </>
    );

    if (gradient && !disabled && type !== 'tertiary') {
      return (
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientButton, getButtonStyle()]}
        >
          {content}
        </LinearGradient>
      );
    }

    return (
      <Animated.View
        style={[
          getButtonStyle(),
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {content}
      </Animated.View>
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Size styles
  buttonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  buttonMedium: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 48,
  },
  buttonLarge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
  },

  // Type styles
  buttonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  buttonTertiary: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },

  // State styles
  buttonDisabled: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },

  // Gradient button
  gradientButton: {
    // Styles are applied via getButtonStyle()
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMedium: {
    fontSize: 16,
    lineHeight: 22,
  },
  textLarge: {
    fontSize: 18,
    lineHeight: 24,
  },

  // Text color styles
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#1C1C1E',
  },
  textTertiary: {
    color: '#007AFF',
  },
  textDanger: {
    color: '#FFFFFF',
  },

  // Icon styles
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default AnimatedButton;