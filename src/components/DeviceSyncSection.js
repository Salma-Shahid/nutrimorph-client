import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import * as Pedometer from "expo-pedometer";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const STEP_SYNC_INTERVAL_MS = 15000;

const getLocalDate = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export default function DeviceSyncSection({ onSyncSuccess }) {
  const { theme, user, token, updateUserStats, recordDailySteps } =
    useAuthStore();
  const colors = getThemeColors(theme);
  const [isSynced, setIsSynced] = useState(user?.isDeviceSynced || false);
  const [syncing, setSyncing] = useState(false);
  const onSyncSuccessRef = useRef(onSyncSuccess);

  useEffect(() => {
    onSyncSuccessRef.current = onSyncSuccess;
  }, [onSyncSuccess]);

  useEffect(() => {
    setIsSynced(Boolean(user?.isDeviceSynced));
  }, [user?.isDeviceSynced]);

  useEffect(() => {
    if (!isSynced) return undefined;

    let isCancelled = false;
    let isRefreshing = false;
    let lastPushedSteps = null;
    let interval;

    const refreshSteps = async () => {
      if (isRefreshing) return;
      isRefreshing = true;

      try {
        const steps = await Pedometer.getTodayStepCountAsync();
        if (isCancelled) return;

        const date = getLocalDate();
        const updatedUser = await recordDailySteps(steps, date);
        if (isCancelled) return;
        const dailySteps = updatedUser?.dailySteps ?? steps;
        onSyncSuccessRef.current?.(dailySteps);

        if (token && steps !== lastPushedSteps) {
          try {
            const response = await axios.post(
              `${BASE_URL}/api/exercise`,
              { date, stepsTotal: steps },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            lastPushedSteps = steps;

            if (response.data?.userStats) {
              await updateUserStats({
                ...response.data.userStats,
                dailySteps: response.data.data?.steps ?? dailySteps,
                stepCountDate: date,
              });
            }
          } catch (error) {
            console.error(
              "Could not sync daily steps to the account:",
              error?.response?.data?.message || error.message,
            );
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Could not read today's device step count:", error);
        }
      } finally {
        isRefreshing = false;
      }
    };

    const startPolling = async () => {
      try {
        const permission = await Pedometer.getPermissionsAsync();
        if (isCancelled) return;
        if (permission.status !== "granted") {
          setIsSynced(false);
          await updateUserStats({ isDeviceSynced: false });
          return;
        }

        const isAvailable = await Pedometer.isAvailableAsync();
        if (isCancelled) return;
        if (!isAvailable) {
          console.warn("Pedometer is unavailable on this device.");
          return;
        }

        await refreshSteps();
        if (!isCancelled) {
          interval = setInterval(refreshSteps, STEP_SYNC_INTERVAL_MS);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Could not start device step synchronization:", error);
        }
      }
    };

    startPolling();

    return () => {
      isCancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isSynced, recordDailySteps, token, updateUserStats]);

  const executeDisconnect = () => {
    setIsSynced(false);
    updateUserStats({ isDeviceSynced: false });
    onSyncSuccessRef.current?.(Number(user?.dailySteps) || 0);
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
          : "Health Connect / Pedometer Sensor";

      const confirmPermissionPrompt = async () => {
        setSyncing(true);
        try {
          const permissionResult = await Pedometer.requestPermissionsAsync();

          if (permissionResult.status !== "granted") {
            setSyncing(false);
            const message =
              "Physical activity permission is required to track steps.";
            if (Platform.OS === "web") {
              alert(message);
            } else {
              Alert.alert("Permission Denied", message);
            }
            return;
          }

          const isAvailable = await Pedometer.isAvailableAsync();
          if (!isAvailable) {
            setSyncing(false);
            const message =
              "Pedometer is unavailable on this device. Physical step sensors are not available in most emulators.";
            if (Platform.OS === "web") {
              alert(message);
            } else {
              Alert.alert("Not Available", message);
            }
            return;
          }

          const syncedSteps = await Pedometer.getTodayStepCountAsync();
          const date = getLocalDate();

          setIsSynced(true);
          setSyncing(false);
          await updateUserStats({ isDeviceSynced: true });
          const updatedUser = await recordDailySteps(syncedSteps, date);
          onSyncSuccessRef.current?.(updatedUser?.dailySteps ?? syncedSteps);

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
            error?.message ||
            "Could not connect to the pedometer or read today's steps.";
          if (Platform.OS === "web") {
            alert(errorMsg);
          } else {
            Alert.alert("Sync Error", errorMsg);
          }
        }
      };

      if (Platform.OS === "web") {
        alert("Step tracking is available in the NutriMorph mobile app.");
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
        Sync steps from your device pedometer or connected health provider.
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
