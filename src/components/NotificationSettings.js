import React, { useState } from "react";
import { View, Text, Switch, StyleSheet, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Ionicons } from "@expo/vector-icons";
import {
  registerForPushNotificationsAsync,
  scheduleWaterReminder,
} from "../services/notificationService";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function NotificationSettings() {
  const { theme } = useAuthStore();
  const colors = getThemeColors(theme);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  // Toggle notification handler
  const handleToggleNotifications = async (value) => {
    setIsNotificationsEnabled(value);

    if (value) {
      // Request permission and schedule notifications when turned on
      const token = await registerForPushNotificationsAsync();
      if (token || Device.isDevice) {
        await scheduleWaterReminder();
        Alert.alert(
          "Success",
          "Water reminder notifications enabled successfully!",
        );
      }
    } else {
      // Cancel all scheduled notifications when turned off
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert("Disabled", "All reminders have been turned off.");
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Reminders & Alerts
      </Text>
      <View style={styles.row}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="notifications-outline" size={20} color="#10B981" />
          <Text
            style={[styles.titleText, { color: colors.text, marginLeft: 10 }]}
          >
            Water Reminders
          </Text>
        </View>

        <Switch
          value={isNotificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: "#CBD5E1", true: "#10B981" }}
          thumbColor={isNotificationsEnabled ? "#FFF" : "#F4F4F5"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  titleText: {
    fontWeight: "bold",
    fontSize: 15,
  },
});
