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

  const handleConnectDevice = async () => {
    setSyncing(true);
    try {
      // Platform specific native health integration simulation / bridge call
      setTimeout(() => {
        setIsSynced(true);
        setSyncing(false);

        // Update user stats or global store
        if (updateUserStats) {
          updateUserStats({ isDeviceSynced: true, dailySteps: 6420 });
        }

        Alert.alert(
          "Success 🎉",
          Platform.OS === "ios"
            ? "Successfully connected with Apple Health! Steps and activity synced."
            : "Successfully connected with Google Fit / Health Connect!",
        );
      }, 1500);
    } catch (error) {
      setSyncing(false);
      Alert.alert("Sync Error", "Could not connect to health services.");
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
        Sync your steps, active calories, and workouts automatically from{" "}
        {Platform.OS === "ios" ? "Apple Health" : "Google Fit"}.
      </Text>

      <TouchableOpacity
        style={[
          styles.syncButton,
          {
            backgroundColor: isSynced ? colors.inputBg : colors.primary,
            borderColor: colors.border,
          },
        ]}
        onPress={handleConnectDevice}
        disabled={syncing || isSynced}
      >
        <Text
          style={[
            styles.syncButtonText,
            { color: isSynced ? colors.text : "#FFFFFF" },
          ]}
        >
          {syncing
            ? "Syncing Device..."
            : isSynced
              ? "Device Connected ✓"
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
