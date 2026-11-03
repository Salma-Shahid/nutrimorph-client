import * as TaskManager from "expo-task-manager";
import * as Pedometer from "expo-pedometer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const STEP_COUNT_TASK = "nutrimorph-step-count-updates";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const MIN_VALID_STEP_DELTA = 3;
const MAX_STEPS_PER_SECOND = 3;

const getUserId = (user) => String(user?._id || user?.id || "");

const getLocalDate = (timestamp) => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const getStepsKey = (userId, date) =>
  `dailySteps:${encodeURIComponent(userId)}:${date}`;

const getSensorKey = (userId, date) =>
  `stepSensorState:${encodeURIComponent(userId)}:${date}`;

TaskManager.defineTask(STEP_COUNT_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background step tracking failed:", error);
    return;
  }

  const sensorSteps = Number(data?.steps);
  const observedAt = Number(data?.observedAt) || Date.now();
  if (!Number.isInteger(sensorSteps) || sensorSteps < 0) return;

  try {
    const [storedUser, token] = await Promise.all([
      AsyncStorage.getItem("user"),
      AsyncStorage.getItem("token"),
    ]);
    if (!storedUser || !token) return;

    const user = JSON.parse(storedUser);
    const userId = getUserId(user);
    if (!userId || !user.isDeviceSynced) return;

    const date = getLocalDate(observedAt);
    const stepsKey = getStepsKey(userId, date);
    const sensorKey = getSensorKey(userId, date);
    const [storedStepsValue, sensorStateValue] = await Promise.all([
      AsyncStorage.getItem(stepsKey),
      AsyncStorage.getItem(sensorKey),
    ]);
    const storedSteps = Number(storedStepsValue);
    let dailySteps =
      storedStepsValue !== null && Number.isFinite(storedSteps)
        ? Math.max(0, Math.floor(storedSteps))
        : user.stepUserId === userId && user.stepCountDate === date
          ? Math.max(0, Math.floor(Number(user.dailySteps) || 0))
          : 0;
    let acceptedDelta = 0;
    let sensorState = sensorStateValue
      ? JSON.parse(sensorStateValue)
      : null;

    if (!sensorState || !Number.isFinite(sensorState.lastSensorSteps)) {
      sensorState = {
        lastSensorSteps: sensorSteps,
        lastObservedAt: observedAt,
        pendingSteps: 0,
        pendingSince: observedAt,
      };
    } else {
      const delta = sensorSteps - sensorState.lastSensorSteps;
      const elapsedSeconds = Math.max(
        1,
        (observedAt - sensorState.lastObservedAt) / 1000,
      );
      sensorState.lastSensorSteps = sensorSteps;
      sensorState.lastObservedAt = observedAt;

      if (delta < 0 || delta / elapsedSeconds > MAX_STEPS_PER_SECOND) {
        sensorState.pendingSteps = 0;
        sensorState.pendingSince = observedAt;
      } else if (delta > 0) {
        if (!sensorState.pendingSteps) sensorState.pendingSince = observedAt - elapsedSeconds * 1000;
        sensorState.pendingSteps += delta;

        if (sensorState.pendingSteps >= MIN_VALID_STEP_DELTA) {
          const pendingSeconds = Math.max(
            1,
            (observedAt - sensorState.pendingSince) / 1000,
          );
          if (sensorState.pendingSteps / pendingSeconds <= MAX_STEPS_PER_SECOND) {
            acceptedDelta = sensorState.pendingSteps;
            dailySteps += acceptedDelta;
            const response = await axios.post(
              `${BASE_URL}/api/exercise`,
              { date, stepsDelta: acceptedDelta },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const stats = response.data?.userStats;
            if (stats) {
              user.steps = stats.steps;
              user.streakCount = stats.streakCount;
              user.unlockedBadges = stats.unlockedBadges || user.unlockedBadges;
            }
          }
          sensorState.pendingSteps = 0;
          sensorState.pendingSince = observedAt;
        }
      }
    }

    const [latestUserValue, latestToken] = await Promise.all([
      AsyncStorage.getItem("user"),
      AsyncStorage.getItem("token"),
    ]);
    if (!latestUserValue || latestToken !== token) return;
    const latestUser = JSON.parse(latestUserValue);
    if (getUserId(latestUser) !== userId) return;
    if (storedStepsValue !== null) {
      const latestStoredSteps = await AsyncStorage.getItem(stepsKey);
      if (latestStoredSteps !== storedStepsValue) {
        dailySteps =
          Math.max(0, Math.floor(Number(latestStoredSteps) || 0)) +
          acceptedDelta;
      }
    }
    latestUser.steps = user.steps;
    latestUser.streakCount = user.streakCount;
    latestUser.unlockedBadges = user.unlockedBadges || latestUser.unlockedBadges;
    latestUser.dailySteps = dailySteps;
    latestUser.stepCountDate = date;
    latestUser.stepUserId = userId;
    await Promise.all([
      AsyncStorage.setItem(stepsKey, String(dailySteps)),
      AsyncStorage.setItem(sensorKey, JSON.stringify(sensorState)),
      AsyncStorage.setItem("user", JSON.stringify(latestUser)),
    ]);
  } catch (taskError) {
    console.error("Could not persist background step updates:", taskError);
  }
});

export const startBackgroundStepTracking = async () => {
  if (!(await TaskManager.isAvailableAsync())) return false;
  if (!(await Pedometer.isBackgroundAvailableAsync())) return false;
  const permission = await Pedometer.requestBackgroundPermissionsAsync();
  if (permission.status !== "granted") return false;
  if (!(await TaskManager.isTaskRegisteredAsync(STEP_COUNT_TASK))) {
    await Pedometer.startStepCountUpdatesAsync(STEP_COUNT_TASK);
  }
  return true;
};

export const stopBackgroundStepTracking = async () => {
  if (!(await TaskManager.isAvailableAsync())) return;
  if (!(await TaskManager.isTaskRegisteredAsync(STEP_COUNT_TASK))) return;
  await Pedometer.stopStepCountUpdatesAsync(STEP_COUNT_TASK);
};
