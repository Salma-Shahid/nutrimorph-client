import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Handle notification presentation when the app is in the foreground
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Request permissions and register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  // Web platform check: Skip native notifications registration on Web
  if (Platform.OS === "web") {
    console.log("Push notifications skipped on Web platform.");
    return null;
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

// Schedule a recurring local water intake reminder with SDK 57 valid trigger format
export async function scheduleWaterReminder() {
  if (Platform.OS === "web") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to Drink Water! 💧",
      body: "Stay hydrated and reach your daily water intake goal.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 2, // Repeat every 2 hours
      repeats: true,
    },
  });
}

// 🛡️ Ensure water reminder is always active (Prevents it from turning off automatically)
export async function ensureWaterReminderScheduled() {
  // 🟢 Web Guard: Prevents Notifications.getAllScheduledNotificationsAsync crash on Web
  if (Platform.OS === "web") {
    console.log("Skipping scheduled notifications check on Web platform.");
    return;
  }

  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const hasWaterReminder = scheduledNotifications.some(
      (notification) =>
        notification.content.title === "Time to Drink Water! 💧",
    );

    if (!hasWaterReminder) {
      await scheduleWaterReminder();
      console.log(
        "Water reminder was missing and has been re-scheduled automatically.",
      );
    } else {
      console.log("Water reminder is already active.");
    }
  } catch (error) {
    console.error("Error ensuring water reminder is scheduled:", error);
  }
}
