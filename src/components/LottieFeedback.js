import React, { Component, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LOTTIE_ASSETS from "../../assets/lottie";

// Loaded lazily so an older dev-client/APK without the native Lottie module
// degrades to the icon fallback instead of crashing at import time.
let LottieView = null;
try {
  LottieView = require("lottie-react-native").default;
} catch {
  LottieView = null;
}

// Fallback visuals per animation name, used whenever an animation file is
// missing, the native module is absent, or playback fails.
const FALLBACK_ICONS = {
  success: "checkmark-circle",
  celebrate: "trophy",
  error: "alert-circle",
};

class LottieErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (__DEV__) console.warn("Lottie animation failed to render:", error?.message);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Selective, failure-proof Lottie animation for key feedback moments
 * (AI analysis, barcode scans, confirmations, milestones).
 *
 * <LottieFeedback name="success" size={96} loop={false} />
 *
 * `name` refers to a file registered in assets/lottie/index.js. A `source`
 * object may be passed instead. Never loads remote URLs.
 */
export default function LottieFeedback({
  name,
  source,
  size = 96,
  loop = true,
  autoPlay = true,
  color = "#34D399",
  speed = 1,
  onFinish,
  style,
  accessibilityLabel,
}) {
  const [failed, setFailed] = useState(false);
  const animation = source || (name ? LOTTIE_ASSETS[name] : null);

  const fallback = (
    <View
      style={[styles.box, { width: size, height: size }, style]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      {FALLBACK_ICONS[name] ? (
        <Ionicons name={FALLBACK_ICONS[name]} size={size * 0.6} color={color} />
      ) : (
        <ActivityIndicator size={size >= 64 ? "large" : "small"} color={color} />
      )}
    </View>
  );

  if (!LottieView || !animation || failed) return fallback;

  return (
    <LottieErrorBoundary fallback={fallback}>
      <View
        style={[styles.box, { width: size, height: size }, style]}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      >
        <LottieView
          source={animation}
          autoPlay={autoPlay}
          loop={loop}
          speed={speed}
          resizeMode="contain"
          style={{ width: size, height: size }}
          webStyle={{ width: size, height: size }}
          onAnimationFailure={() => setFailed(true)}
          onAnimationFinish={(isCancelled) => {
            if (!isCancelled && onFinish) onFinish();
          }}
        />
      </View>
    </LottieErrorBoundary>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
