import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, ToastAndroid } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Loaded lazily so a binary without the native module still runs; web falls
// back to the browser clipboard API.
let Clipboard = null;
try {
  Clipboard = require("expo-clipboard");
} catch {
  Clipboard = null;
}

// Markdown → readable plain text for pasting elsewhere.
export const toPlainText = (text) =>
  String(text || "")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[*-]\s+/gm, "• ")
    .trim();

export const copyText = async (text) => {
  const value = toPlainText(text);
  if (!value) return false;
  try {
    if (Clipboard?.setStringAsync) {
      const ok = await Clipboard.setStringAsync(value);
      if (ok !== false) return true;
    }
  } catch {
    // fall through to the web API
  }
  try {
    if (Platform.OS === "web" && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

// Shared copy state (idle → copied/failed → idle) with Android toast feedback.
export const useCopyMessage = (text) => {
  const [state, setState] = useState("idle");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(async () => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    if (ok && Platform.OS === "android") {
      ToastAndroid.show("Message copied", ToastAndroid.SHORT);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }, [text]);
  return { state, copy };
};

export default function CopyMessageButton({ state, onPress, colors, label = "Copy" }) {
  const copied = state === "copied";
  const failed = state === "failed";
  const tint = copied ? colors.primary : failed ? colors.danger : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={copied ? "Copied" : "Copy message"}
      style={({ pressed, hovered }) => [
        styles.button,
        { borderColor: copied ? colors.primary : colors.border },
        (pressed || hovered) && { backgroundColor: colors.glassGlow },
      ]}
    >
      <Ionicons
        name={copied ? "checkmark" : failed ? "alert-circle-outline" : "copy-outline"}
        size={13}
        color={tint}
      />
      <Text style={[styles.label, { color: tint }]}>
        {copied ? "Copied" : failed ? "Couldn't copy" : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: "600" },
});
