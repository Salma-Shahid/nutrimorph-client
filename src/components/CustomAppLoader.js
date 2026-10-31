import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Easing } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

/**
 * Animated Custom App Logo Loader with Stable Glassmorphism & Soft Fade/Glow Effect
 */
const CustomAppLoader = ({ size = 60, text = "NutriBot is thinking..." }) => {
  const { theme } = useAuthStore();
  const colors = getThemeColors(theme);

  // Only Opacity Animation (No Scale/Bounce movement)
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Smooth Breathing Fade Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacityAnim]);

  return (
    <View style={styles.container}>
      {/* Outer Glowing Gradient Ring (Stable Position, Fading Opacity) */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size + 24,
            height: size + 24,
            borderRadius: (size + 24) / 2,
            backgroundColor: colors.glassGlow || "rgba(16, 185, 129, 0.35)",
            shadowColor: colors.primary,
            opacity: opacityAnim,
          },
        ]}
      />

      {/* Stable App Icon */}
      <Animated.Image
        source={require("../../assets/icon.png")}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: size / 4,
            shadowColor: colors.primary,
            opacity: opacityAnim,
          },
        ]}
        resizeMode="contain"
      />

      {text ? (
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {text}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  glowRing: {
    position: "absolute",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  logo: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export default CustomAppLoader;
