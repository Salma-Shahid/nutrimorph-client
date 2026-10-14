import React, { useEffect, useRef } from "react";
import { View, Animated, Image, StyleSheet, Easing } from "react-native";

/**
 * Animated Custom App Logo Loader with Breathing & Glowing Effect
 */
const CustomAppLoader = ({ size = 60, text = "NutriBot is thinking..." }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Continuous Breathing / Pulse Animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.18,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.4,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Outer Glowing Gradient Ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size + 24,
            height: size + 24,
            borderRadius: (size + 24) / 2,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />

      {/* Animated App Icon */}
      <Animated.Image
        source={require("../../assets/icon.png")} // Change to your app logo/icon path
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: size / 4,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  glowRing: {
    position: "absolute",
    backgroundColor: "rgba(16, 185, 129, 0.35)", // NutriMorph theme green glow
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  logo: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default CustomAppLoader;
