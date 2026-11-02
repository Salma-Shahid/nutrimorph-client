import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function DeviceSyncSection() {
  const { theme, user, updateUserStats } = useAuthStore();
  const colors = getThemeColors(theme);
  const [isSynced, setIsSynced] = useState(user?.isDeviceSynced || false);
  const [syncing, setSyncing] = useState(false);

  // Helper for Disconnect logic
  const executeDisconnect = () => {
    setIsSynced(false);
    if (updateUserStats) {
      updateUserStats({ isDeviceSynced: false, dailySteps: 0 });
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
      // Web vs Native Disconnect Handling
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
      // Connect & Permission Prompt Logic
      const providerName =
        Platform.OS === "ios" ? "Apple Health" : "Google Fit / Health Connect";

      const confirmPermissionPrompt = () => {
        setSyncing(true);
        try {
          // Simulating native health permissions and step synchronization callback
          setTimeout(() => {
            setIsSynced(true);
            setSyncing(false);

            if (updateUserStats) {
              updateUserStats({ isDeviceSynced: true, dailySteps: 5430 });
            }

            const successMsg = `Successfully connected with ${providerName}! Permissions granted and steps synchronized.`;

            if (Platform.OS === "web") {
              alert(`Success 🎉\n${successMsg}`);
            } else {
              Alert.alert("Success 🎉", successMsg);
            }
          }, 1500);
        } catch (error) {
          setSyncing(false);
          const errorMsg =
            "Could not connect to health services or request permissions.";
          if (Platform.OS === "web") {
            alert(errorMsg);
          } else {
            Alert.alert("Sync Error", errorMsg);
          }
        }
      };

      // Native Permission Request Alert Confirmation Dialog
      if (Platform.OS === "web") {
        const allowSync = window.confirm(
          `Connect Fitness Provider\n\nNutriMorph needs permission to read your step count and active calories from ${providerName}. Allow access?`,
        );
        if (allowSync) {
          confirmPermissionPrompt();
        }
      } else {
        Alert.alert(
          "Connect Fitness Provider 🏃‍♀️",
          `NutriMorph needs permission to read your step count and active calories from ${providerName}.`,
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
        Sync your steps, active calories, and workouts automatically from your
        fitness provider.
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
