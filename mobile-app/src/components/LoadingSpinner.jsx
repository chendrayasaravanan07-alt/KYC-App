import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions();

const LoadingSpinner = ({
  size = 'medium', // small, medium, large, fullscreen
  type = 'default', // default, pulse, dots, bounce, lottie
  color = '#007AFF',
  text,
  overlay = false,
  animationConfig = {},
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    switch (type) {
      case 'pulse':
        animatePulse();
        break;
      case 'dots':
        animateDots();
        break;
      case 'bounce':
        animateBounce();
        break;
      case 'rotate':
        animateRotate();
        break;
      default:
        animateDefault();
        break;
    }
  }, [type]);

  const animateDefault = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animatePulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animateDots = () => {
    const createDotAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(800),
        ])
      );
    };

    createDotAnimation(dotsAnim[0], 0).start();
    createDotAnimation(dotsAnim[1], 200).start();
    createDotAnimation(dotsAnim[2], 400).start();
  };

  const animateBounce = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animateRotate = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return { width: 24, height: 24, padding: 16 };
      case 'large':
        return { width: 48, height: 48, padding: 32 };
      case 'fullscreen':
        return { width: 64, height: 64, padding: 40 };
      default:
        return { width: 32, height: 32, padding: 24 };
    }
  };

  const sizeValue = getSizeValue();

  const renderSpinner = () => {
    switch (type) {
      case 'lottie':
        return (
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={[
              {
                width: sizeValue.width * 2,
                height: sizeValue.height * 2,
              },
              style,
            ]}
          />
        );

      case 'dots':
        return (
          <View style={[styles.dotsContainer, style]}>
            {dotsAnim.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: color,
                    transform: [
                      {
                        scale: anim,
                      },
                    ],
                    opacity: anim,
                  },
                ]}
              />
            ))}
          </View>
        );

      case 'pulse':
        return (
          <Animated.View
            style={[
              styles.pulseContainer,
              {
                width: sizeValue.width,
                height: sizeValue.height,
                transform: [{ scale: pulseAnim }],
              },
              style,
            ]}
          >
            <LinearGradient
              colors={[color, `${color}88`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCircle}
            />
          </Animated.View>
        );

      case 'bounce':
        return (
          <Animated.View
            style={[
              styles.bounceContainer,
              {
                width: sizeValue.width,
                height: sizeValue.height,
                transform: [{ scale: scaleAnim }],
              },
              style,
            ]}
          >
            <View style={[styles.circle, { backgroundColor: color }]} />
          </Animated.View>
        );

      case 'rotate':
        return (
          <Animated.View
            style={[
              styles.rotateContainer,
              {
                width: sizeValue.width,
                height: sizeValue.height,
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
              style,
            ]}
          >
            <View style={[styles.rotateCircle, { borderColor: color }]} />
          </Animated.View>
        );

      default:
        return (
          <Animated.View
            style={[
              styles.defaultContainer,
              {
                width: sizeValue.width,
                height: sizeValue.height,
                transform: [{ scale: scaleAnim }],
              },
              style,
            ]}
          >
            <ActivityIndicator
              size={size === 'small' ? 'small' : size === 'large' ? 'large' : 'default'}
              color={color}
            />
          </Animated.View>
        );
    }
  };

  const renderContent = () => {
    return (
      <View style={styles.contentContainer}>
        {renderSpinner()}
        {text && (
          <Text style={[styles.text, { color, fontSize: size === 'small' ? 12 : size === 'large' ? 18 : 14 }]}>
            {text}
          </Text>
        )}
      </View>
    );
  };

  if (size === 'fullscreen' || overlay) {
    return (
      <View style={styles.fullscreenOverlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
          style={styles.gradientOverlay}
        >
          {renderContent()}
        </LinearGradient>
      </View>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  // Fullscreen overlay
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },

  // Content container
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Default spinner
  defaultContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Dots animation
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Pulse animation
  pulseContainer: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },

  // Bounce animation
  bounceContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },

  // Rotate animation
  rotateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotateCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },

  // Text
  text: {
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default LoadingSpinner;