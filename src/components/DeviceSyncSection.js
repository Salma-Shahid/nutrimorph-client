import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pedometer } from "expo-pedometer";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function DeviceSyncSection({ onSyncSuccess }) {
  const { theme, user, updateUserStats } = useAuthStore();
  const colors = getThemeColors(theme);
  const [isSynced, setIsSynced] = useState(user?.isDeviceSynced || false);
  const [syncing, setSyncing] = useState(false);

  // Monitor real-time pedometer subscription if synced
  useEffect(() => {
    let subscription;
    const watchSteps = async () => {
      if (isSynced) {
        try {
          const isAvailable = await Pedometer.isAvailableAsync();
          console.log("Pedometer available:", isAvailable);

          if (isAvailable) {
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0); // Aaj ki subah se steps count

            const pastStepsResult = await Pedometer.getStepCountAsync(
              start,
              end,
            );
            const initialSteps = pastStepsResult ? pastStepsResult.steps : 0;
            console.log("Initial past steps:", initialSteps);

            if (updateUserStats) {
              updateUserStats({
                isDeviceSynced: true,
                dailySteps: initialSteps,
              });
            }
            if (onSyncSuccess) {
              onSyncSuccess(initialSteps);
            }

            // Real-time step listener
            subscription = Pedometer.watchStepCount((result) => {
              console.log("Live pedometer step update:", result.steps);
              const liveSteps = result.steps;
              if (updateUserStats) {
                updateUserStats({
                  isDeviceSynced: true,
                  dailySteps: liveSteps,
                });
              }
              if (onSyncSuccess) {
                onSyncSuccess(liveSteps);
              }
            });
          } else {
            console.log(
              "Pedometer sensor is not available on this device/emulator.",
            );
          }
        } catch (error) {
          console.log("Pedometer live watch error:", error);
        }
      }
    };

    watchSteps();

    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, [isSynced]);

  // Helper for Disconnect logic
  const executeDisconnect = () => {
    setIsSynced(false);
    if (updateUserStats) {
      updateUserStats({ isDeviceSynced: false, dailySteps: 0 });
    }
    if (onSyncSuccess) {
      onSyncSuccess(0);
    }
    const msg = "Device successfully disconnected.";
    if (Platform.OS === "web") {
      alert(msg);
    } else {
      Alert.alert("Disconnected", msg);
    }
  };

  const handleToggleSync = async () => {
    if (isSynced) {
      if (Platform.OS === "web") {
        const confirmDisconnect = window.confirm(
          "Are you sure you want to disconnect your health tracking device?",
        );
        if (confirmDisconnect) {
          executeDisconnect();
        }
      } else {
        Alert.alert(
          "Disconnect Device",
          "Are you sure you want to disconnect your health tracking device?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Disconnect",
              style: "destructive",
              onPress: executeDisconnect,
            },
          ],
        );
      }
    } else {
      const providerName =
        Platform.OS === "ios"
          ? "Apple Health"
          : "Google Fit / Pedometer Sensor";

      const confirmPermissionPrompt = async () => {
        setSyncing(true);
        try {
          const permissionResult = await Pedometer.requestPermissionsAsync();
          console.log("Pedometer permission result:", permissionResult);

          if (!permissionResult.granted) {
            setSyncing(false);
            Alert.alert(
              "Permission Denied",
              "Physical activity permission is required to track steps.",
            );
            return;
          }

          const isAvailable = await Pedometer.isAvailableAsync();
          if (!isAvailable) {
            setSyncing(false);
            Alert.alert(
              "Not Available",
              "Pedometer sensor is not available on this device (Emulators do not support physical step sensors).",
            );
            return;
          }

          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);

          const pastStepsResult = await Pedometer.getStepCountAsync(start, end);
          const syncedSteps = pastStepsResult ? pastStepsResult.steps : 0;

          setIsSynced(true);
          setSyncing(false);

          if (updateUserStats) {
            updateUserStats({ isDeviceSynced: true, dailySteps: syncedSteps });
          }

          if (onSyncSuccess) {
            onSyncSuccess(syncedSteps);
          }

          const successMsg = `Successfully connected with ${providerName}! Pedometer active. Synced ${syncedSteps} steps.`;

          if (Platform.OS === "web") {
            alert(`Success 🎉\n${successMsg}`);
          } else {
            Alert.alert("Success 🎉", successMsg);
          }
        } catch (error) {
          setSyncing(false);
          console.log("Sync error details:", error);
          const errorMsg =
            "Could not connect to health hardware or request permissions.";
          if (Platform.OS === "web") {
            alert(errorMsg);
          } else {
            Alert.alert("Sync Error", errorMsg);
          }
        }
      };

      if (Platform.OS === "web") {
        const allowSync = window.confirm(
          `Connect Fitness Provider\n\nNutriMorph needs permission to read your step count from ${providerName}. Allow access?`,
        );
        if (allowSync) {
          confirmPermissionPrompt();
        }
      } else {
        Alert.alert(
          "Connect Fitness Provider 🏃‍♀️",
          `NutriMorph needs permission to read your step count from ${providerName}.`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setSyncing(false),
            },
            {
              text: "Allow & Connect",
              onPress: confirmPermissionPrompt,
            },
          ],
        );
      }
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="fitness-outline" size={22} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Health & Device Sync
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isSynced
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(100, 116, 139, 0.15)",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isSynced ? colors.primary : colors.textSecondary },
            ]}
          >
            {isSynced ? "Connected" : "Not Connected"}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Sync your steps automatically from your device hardware pedometer
        sensor.
      </Text>

      <TouchableOpacity
        style={[
          styles.syncButton,
          {
            backgroundColor: isSynced ? colors.inputBg : colors.primary,
            borderColor: colors.border,
          },
        ]}
        onPress={handleToggleSync}
        disabled={syncing}
      >
        <Text
          style={[
            styles.syncButtonText,
            { color: isSynced ? "#EF4444" : "#FFFFFF" },
          ]}
        >
          {syncing
            ? "Requesting Permissions..."
            : isSynced
              ? "Disconnect Device ✕"
              : "Connect Health Device"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "bold" },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  syncButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  syncButtonText: {
    fontWeight: "bold",
    fontSize: 14,
  },
});
