import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import LottieFeedback from "./LottieFeedback";

const LASER_GREEN = "#39FF14";
const FRAME_WIDTH = 260;
const FRAME_HEIGHT = 170;
const USE_NATIVE_DRIVER = Platform.OS !== "web";
const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"];

/**
 * Full-screen barcode scanner.
 *
 * Black-screen fixes:
 * - The camera mounts only after the modal has finished presenting
 *   (`onShow`), and unmounts when closed, so Android never binds the preview
 *   to a view that is still animating in or already hidden. Only one camera
 *   preview is ever active.
 * - The preview fills a `flex: 1` container instead of relying on absolute
 *   fill inside the modal root.
 * - Permission, "still starting" and mount-error states are rendered
 *   explicitly instead of leaving a black view.
 */
export default function BarcodeScannerModal({ visible, busy, onClose, onScanned }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [shown, setShown] = useState(false);
  const [ready, setReady] = useState(false);
  const [mountError, setMountError] = useState("");
  const [cameraKey, setCameraKey] = useState(0);
  const [torch, setTorch] = useState(false);
  const laser = useRef(new Animated.Value(0)).current;

  // Reset per open; on iOS/web onShow can be skipped, so also arm on visible.
  useEffect(() => {
    if (!visible) {
      setShown(false);
      setReady(false);
      setMountError("");
      setTorch(false);
      return undefined;
    }
    const fallback = setTimeout(() => setShown(true), Platform.OS === "android" ? 450 : 50);
    return () => clearTimeout(fallback);
  }, [visible]);

  // Laser sweep runs only while actively scanning.
  useEffect(() => {
    if (!visible || !ready || busy) {
      laser.stopAnimation();
      return undefined;
    }
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(laser, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    sweep.start();
    return () => sweep.stop();
  }, [busy, laser, ready, visible]);

  const granted = Boolean(permission?.granted);
  const canAsk = permission?.canAskAgain !== false;
  const mountCamera = visible && shown && granted;

  const translateY = laser.interpolate({
    inputRange: [0, 1],
    outputRange: [6, FRAME_HEIGHT - 8],
  });

  const renderPermission = () => (
    <View style={styles.centerState}>
      <Ionicons name="camera-outline" size={44} color={LASER_GREEN} />
      <Text style={styles.stateTitle}>Camera access needed</Text>
      <Text style={styles.stateText}>
        NutriMorph uses the camera only to read product barcodes.
      </Text>
      <Pressable
        style={styles.primaryButton}
        onPress={() => (canAsk ? requestPermission() : Linking.openSettings())}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>
          {canAsk ? "Allow camera" : "Open settings"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onShow={() => setShown(true)}
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={["portrait"]}
    >
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={LASER_GREEN} />
          </View>
        ) : !granted ? (
          renderPermission()
        ) : mountError ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={44} color="#F87171" />
            <Text style={styles.stateTitle}>Camera couldn't start</Text>
            <Text style={styles.stateText}>{mountError}</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                setMountError("");
                setReady(false);
                setCameraKey((key) => key + 1);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {mountCamera && (
              <CameraView
                key={cameraKey}
                style={styles.camera}
                facing="back"
                enableTorch={torch}
                barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
                onCameraReady={() => setReady(true)}
                onMountError={(event) =>
                  setMountError(
                    event?.message ||
                      "Another app may be using the camera. Close it and try again.",
                  )
                }
                onBarcodeScanned={
                  ready && !busy
                    ? (result) => result?.data && onScanned(result.data)
                    : undefined
                }
              />
            )}

            {/* Overlay: dimmed mask with a clear viewfinder window. */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.mask} />
              <View style={styles.maskRow}>
                <View style={styles.mask} />
                <View style={styles.frame}>
                  {["tl", "tr", "bl", "br"].map((corner) => (
                    <View key={corner} style={[styles.corner, styles[corner]]} />
                  ))}
                  {ready && !busy && (
                    <Animated.View
                      style={[styles.laserWrap, { transform: [{ translateY }] }]}
                    >
                      <View style={styles.laserGlow} />
                      <View style={styles.laserLine} />
                    </Animated.View>
                  )}
                  {busy && (
                    <View style={styles.busyOverlay}>
                      <LottieFeedback name="scanning" size={72} color={LASER_GREEN} />
                    </View>
                  )}
                </View>
                <View style={styles.mask} />
              </View>
              <View style={[styles.mask, styles.hintArea]}>
                <Text style={styles.hint}>
                  {busy
                    ? "Barcode found · looking up nutrition…"
                    : ready
                      ? "Align the barcode inside the frame"
                      : "Starting camera…"}
                </Text>
              </View>
            </View>

            {!ready && (
              <View style={styles.startingBadge} pointerEvents="none">
                <ActivityIndicator color={LASER_GREEN} />
              </View>
            )}
          </>
        )}

        <View style={[styles.topBar, { top: insets.top + 10 }]}>
          {granted && !mountError && Platform.OS !== "web" ? (
            <Pressable
              onPress={() => setTorch((value) => !value)}
              style={styles.roundButton}
              accessibilityRole="button"
              accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"}
            >
              <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#FFF" />
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            onPress={onClose}
            style={styles.roundButton}
            accessibilityRole="button"
            accessibilityLabel="Close barcode scanner"
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const MASK = "rgba(0, 0, 0, 0.55)";
const CORNER = 26;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  mask: { flex: 1, backgroundColor: MASK },
  maskRow: { flexDirection: "row", height: FRAME_HEIGHT },
  frame: { width: FRAME_WIDTH, height: FRAME_HEIGHT, overflow: "hidden" },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: LASER_GREEN,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  laserWrap: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 0,
    height: 12,
    justifyContent: "center",
  },
  laserGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(57, 255, 20, 0.18)",
  },
  laserLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: LASER_GREEN,
    shadowColor: LASER_GREEN,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  hintArea: { alignItems: "center", paddingTop: 22 },
  hint: { color: "#E5FBE0", fontSize: 14, fontWeight: "600", textAlign: "center" },
  startingBadge: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -12,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 10,
  },
  stateTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", textAlign: "center" },
  stateText: { color: "#CBD5E1", fontSize: 14, textAlign: "center", lineHeight: 20 },
  primaryButton: {
    marginTop: 10,
    backgroundColor: LASER_GREEN,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#052E16", fontWeight: "800", fontSize: 15 },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
