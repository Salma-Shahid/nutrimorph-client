import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { getAccentNeon, getThemeColors } from "../theme/colors";

const hexToRgba = (hex, alpha) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!match) return hex;
  const [r, g, b] = match.slice(1).map((value) => parseInt(value, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Neon-bordered card in the Admin Dashboard style.
 *
 * - Smooth border/background transition on press (all platforms), hover and
 *   keyboard focus (web), or when `active` is set.
 * - Colours animate on the JS driver (colours cannot use the native driver),
 *   so it behaves identically on Android, iOS and Web.
 * - Light mode keeps the border and glow subtle for readability.
 */
export default function NeonCard({
  children,
  style,
  // Layout of the outer touch target (width/flex when placed in a row).
  containerStyle,
  accent = "green",
  onPress,
  onLongPress,
  active = false,
  disabled = false,
  glow = true,
  accessibilityLabel,
  accessibilityRole,
  testID,
}) {
  const theme = useAuthStore((state) => state.theme) || "dark";
  const colors = getThemeColors(theme);
  const isDark = theme === "dark";
  const neon = getAccentNeon(accent, theme);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const highlight = useRef(new Animated.Value(active ? 1 : 0)).current;
  const interactive = Boolean(onPress || onLongPress) && !disabled;
  const target = pressed ? 1 : active || hovered || focused ? 0.75 : 0;

  useEffect(() => {
    Animated.timing(highlight, {
      toValue: target,
      duration: pressed ? 90 : 180,
      useNativeDriver: false,
    }).start();
  }, [highlight, pressed, target]);

  const restBorder = hexToRgba(neon, isDark ? 0.28 : 0.2);
  const activeBorder = hexToRgba(neon, isDark ? 0.95 : 0.6);
  const borderColor = highlight.interpolate({
    inputRange: [0, 1],
    outputRange: [restBorder, activeBorder],
  });
  const backgroundColor = highlight.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.cardBg, colors.pressedBg],
  });

  const glowStyle =
    glow && Platform.OS === "web"
      ? {
          // Web: real coloured glow via box-shadow (static rest + hover state).
          boxShadow:
            target > 0
              ? `0 0 0 1px ${hexToRgba(neon, isDark ? 0.35 : 0.15)}, 0 0 ${isDark ? 18 : 10}px ${hexToRgba(neon, isDark ? 0.35 : 0.14)}`
              : `0 1px 3px ${hexToRgba(colors.cardShadow, colors.cardShadowOpacity)}`,
          transitionProperty: "box-shadow",
          transitionDuration: "180ms",
        }
      : glow
        ? {
            // iOS uses the coloured shadow; Android shows neutral elevation.
            shadowColor: target > 0 ? neon : colors.cardShadow,
            shadowOpacity:
              target > 0 ? colors.neonShadowOpacity : colors.cardShadowOpacity,
            shadowRadius: target > 0 ? 10 : 4,
            shadowOffset: { width: 0, height: target > 0 ? 0 : 2 },
            elevation: target > 0 ? 4 : 1,
          }
        : null;

  return (
    <Pressable
      testID={testID}
      onPress={interactive ? onPress : undefined}
      onLongPress={interactive ? onLongPress : undefined}
      onPressIn={interactive ? () => setPressed(true) : undefined}
      onPressOut={interactive ? () => setPressed(false) : undefined}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={!interactive}
      accessibilityRole={accessibilityRole || (interactive ? "button" : undefined)}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={interactive ? { disabled } : undefined}
      // Keep children as the layout root: the flattened style goes on the
      // animated view so callers can pass flexDirection, padding, etc.
      style={[styles.pressable, containerStyle]}
    >
      <Animated.View
        style={[
          styles.card,
          containerStyle && styles.fill,
          style,
          { borderColor, backgroundColor },
          glowStyle,
          disabled && styles.disabled,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { minWidth: 0 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    minWidth: 0,
  },
  fill: { flexGrow: 1 },
  disabled: { opacity: 0.6 },
});
