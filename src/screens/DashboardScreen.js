import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../store/useAuthStore";
import { useMealStore } from "../store/useMealStore";
import { getThemeColors } from "../theme/colors";
import AdBanner from "../components/AdBanner";
import { saveDataToCache, getDataFromCache } from "../utils/cache";
import StreakHeader from "../components/StreakHeader";
import DeviceSyncSection from "../components/DeviceSyncSection";
import WeightProgressCard from "../components/WeightProgressCard";
import { isActiveProUser, getPlanLabel } from "../utils/subscription";
import { getBmiInfo } from "../utils/bmi";
import NeonCard from "../components/NeonCard";
import useSyncedCounter from "../hooks/useSyncedCounter";
import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const idOf = (user) => String(user?._id || user?.id || "");
const formatKcal = (value) =>
  Math.max(0, Math.round(Number(value) || 0)).toLocaleString("en-US");
const BMI_COLORS = {
  Underweight: "#F59E0B",
  Normal: null, // uses theme primary
  Overweight: "#F97316",
  Obese: null, // uses theme danger
};

export default function DashboardScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const userId = String(user?._id || user?.id || "");
  const cacheScope = encodeURIComponent(userId || "signed-out");
  const mealCacheKey = (date) => `meals:${cacheScope}:${date}`;
  const waterCacheKey = (date) => `water:${cacheScope}:${date}`;
  const weeklyCacheKey = `weekly_summary:${cacheScope}`;
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
  const recordDailySteps = useAuthStore((state) => state.recordDailySteps);
  const setDailySteps = useAuthStore((state) => state.setDailySteps);
  const refreshUserProfile = useAuthStore((state) => state.refreshUserProfile);
  const token = useAuthStore((state) => state.token);

  const {
    meals,
    totalCalories,
    fetchTodayMeals,
    waterIntake,
    fetchWaterIntake,
    updateWaterIntake,
    deleteMeal,
    weeklyHistory,
    weeklyAiInsight,
    fetchWeeklySummary,
  } = useMealStore();

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [aiRecoveryTip, setAiRecoveryTip] = useState(null);

  // Modals & Interactive States
  const [showWeighModal, setShowWeighModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [caloriesInput, setCaloriesInput] = useState("");

  // Exercise & Steps State
  const [manualStepTotal, setManualStepTotal] = useState("0");
  const [weightHistory, setWeightHistory] = useState([]);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Device local date in YYYY-MM-DD format
  const getLocalDate = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const todayKey = getLocalDate();
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const isStillActiveUser = () => idOf(useAuthStore.getState().user) === userId;

  // ---- Steps: instant taps, debounced absolute-total sync ----------------
  const storedDailySteps =
    user?.stepUserId === userId && user?.stepCountDate === todayKey
      ? Number(user.dailySteps) || 0
      : 0;

  const syncSteps = useCallback(
    async (total) => {
      const today = getLocalDate();
      if (!isStillActiveUser()) return undefined;
      // Local persistence first (user-scoped AsyncStorage key), then server.
      await setDailySteps(total, today);
      if (!token) return total;
      const response = await axios.post(
        `${API_BASE_URL}/api/exercise`,
        { date: today, stepsTotal: total },
        authHeaders,
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Step sync failed.");
      }
      if (!isStillActiveUser()) return undefined;
      const serverSteps = Number(response.data.data?.steps ?? total);
      if (response.data.userStats) {
        await updateUserStats({
          ...response.data.userStats,
          dailySteps: serverSteps,
          stepCountDate: today,
          stepUserId: userId,
        });
      }
      return serverSteps;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setDailySteps, token, updateUserStats, userId],
  );

  const steps = useSyncedCounter({
    value: storedDailySteps,
    sync: syncSteps,
    max: 1000000,
    resetKey: `${userId}:${todayKey}`,
  });
  const stepCount = steps.count;

  useEffect(() => {
    setManualStepTotal(String(stepCount));
  }, [stepCount]);

  // New day / account without a synced device: start today's local count.
  useEffect(() => {
    if (!userId || user?.isDeviceSynced) return;
    if (user?.stepUserId === userId && user?.stepCountDate === todayKey) return;
    recordDailySteps(0, todayKey).catch((error) =>
      console.error("Could not reset the local daily step count:", error),
    );
  }, [
    recordDailySteps,
    todayKey,
    userId,
    user?.isDeviceSynced,
    user?.stepCountDate,
    user?.stepUserId,
  ]);

  // ---- Water: same pattern, glasses persisted as an absolute count -------
  const water = useSyncedCounter({
    value: waterIntake,
    max: 100,
    delay: 600,
    resetKey: `${userId}:${todayKey}`,
    onLocalChange: (glasses) => useMealStore.setState({ waterIntake: glasses }),
    onPendingChange: (pending) =>
      useMealStore.setState({ waterPendingSync: pending }),
    sync: async (glasses) => {
      const today = getLocalDate();
      if (!isStillActiveUser()) return undefined;
      const res = await updateWaterIntake(glasses, today, { applyResult: false });
      if (!res?.success) {
        throw new Error(res?.message || "Could not update water intake.");
      }
      await saveDataToCache(waterCacheKey(today), glasses);
      return glasses;
    },
  });
  const waterGlasses = water.count;

  // Fetch Exercise & Steps from backend
  const fetchExerciseData = async (date) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/exercise?date=${date}`,
        authHeaders,
      );
      if (!isStillActiveUser()) return;
      if (res.data?.success) {
        setCaloriesBurned(res.data.data.caloriesBurned || 0);
        // Never let a fetch overwrite step taps that are still syncing.
        if (!steps.isDirty()) {
          await setDailySteps(Number(res.data.data.steps) || 0, date);
        }
      }
    } catch (error) {
      if (__DEV__) console.log("Exercise data unavailable:", error.message);
    }
  };

  const fetchWeightHistory = async () => {
    try {
      // Full account history (server caps it); the card charts the latest.
      const response = await axios.get(
        `${API_BASE_URL}/api/weight?limit=365`,
        authHeaders,
      );
      if (!isStillActiveUser()) return;
      if (response.data?.success) {
        setWeightHistory(response.data.data || []);
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          "Weight history unavailable:",
          error?.response?.data?.message || error.message,
        );
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const todayDate = getLocalDate();
      const [profileRefresh] = await Promise.all([
        refreshUserProfile({ force: true }),
        fetchTodayMeals(todayDate),
        fetchWaterIntake(todayDate),
        fetchWeeklySummary(),
        fetchExerciseData(todayDate),
        fetchWeightHistory(),
        steps.flush(),
        water.flush(),
      ]);
      if (profileRefresh?.offline) {
        Alert.alert(
          "You're offline",
          "Showing your last synced data. Changes will sync when you're back online.",
        );
      } else if (!profileRefresh?.success && !profileRefresh?.sessionExpired) {
        Alert.alert(
          "Refresh incomplete",
          profileRefresh?.message || "Some dashboard data could not be refreshed.",
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdjustSteps = (delta) => steps.set((current) => current + delta);

  const handleSetManualSteps = () => {
    const total = Number(String(manualStepTotal).replace(/[,\s]/g, ""));
    if (!Number.isInteger(total) || total < 0 || total > 1000000) {
      Alert.alert(
        "Invalid step total",
        "Enter a whole number from 0 to 1,000,000.",
      );
      return;
    }
    steps.set(total);
    steps.flush();
  };

  // Save Exercise Handler (Backend Connected)
  const handleSaveExercise = async () => {
    if (!caloriesInput) {
      Alert.alert("Error", "Please enter calories burned!");
      return;
    }
    const todayDate = getLocalDate();
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const res = await axios.post(
        `${BASE_URL}/api/exercise`,
        {
          date: todayDate,
          caloriesBurned: Number(caloriesInput),
          exerciseName: exerciseName || "Workout",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const activeUser = useAuthStore.getState().user;
      if (String(activeUser?._id || activeUser?.id || "") !== userId) return;
      if (res.data?.success) {
        setCaloriesBurned(res.data.data.caloriesBurned);
        if (res.data?.userStats) {
          useAuthStore.getState().updateUserStats(res.data.userStats);
        }
        setShowExerciseModal(false);
        setCaloriesInput("");
        setExerciseName("");
        Alert.alert("Success", "Exercise logged successfully!");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to log exercise");
    }
  };

  // Save Weight Handler (Backend Connected)
  const handleSaveWeight = async () => {
    const weight = Number(newWeight);
    if (!Number.isFinite(weight) || weight < 15 || weight > 500) {
      Alert.alert("Error", "Please enter a valid weight in KG.");
      return;
    }

    try {
      const baseUrl =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const res = await axios.post(
        `${baseUrl}/api/weight`,
        { weight },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const activeUser = useAuthStore.getState().user;
      if (String(activeUser?._id || activeUser?.id || "") !== userId) return;

      if (res.data?.success) {
        await updateUserStats({ weight, ...(res.data.user || {}) });
        setWeightHistory((current) => [...current, res.data.data]);
        Alert.alert(
          "Success",
          `Weight successfully updated to ${weight} KG!`,
        );
        setShowWeighModal(false);
        setNewWeight("");
      } else {
        Alert.alert("Error", "Could not update weight.");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Could not save weight.",
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadDashboardData = async () => {
        const todayDate = getLocalDate();
        const isCurrent = () => isMounted && isStillActiveUser();

        // 1. Show this user's cached data instantly (offline-friendly). Only
        //    fills empty state, so it never overwrites fresher data.
        const store = useMealStore.getState();
        if (!store.meals?.length) {
          const [cachedMeals, cachedWater, cachedWeekly] = await Promise.all([
            getDataFromCache(mealCacheKey(todayDate)),
            getDataFromCache(waterCacheKey(todayDate)),
            getDataFromCache(weeklyCacheKey),
          ]);
          if (isCurrent() && Array.isArray(cachedMeals) && cachedMeals.length) {
            const total = cachedMeals.reduce(
              (sum, meal) => sum + (Number(meal.calories) || 0),
              0,
            );
            useMealStore.setState({
              meals: cachedMeals,
              todayMeals: cachedMeals,
              totalCalories: total,
            });
          }
          if (isCurrent() && Number.isFinite(cachedWater) && !water.isDirty()) {
            useMealStore.setState({ waterIntake: cachedWater });
          }
          if (isCurrent() && cachedWeekly?.weeklyHistory) {
            useMealStore.setState({
              weeklyHistory: cachedWeekly.weeklyHistory,
              weeklyAiInsight: cachedWeekly.weeklyAiInsight || "",
            });
          }
        }

        // 2. Refresh from the server. Each fetch keeps existing data on
        //    failure, so offline/CORS errors never blank the dashboard.
        const [profile] = await Promise.all([
          refreshUserProfile(),
          fetchTodayMeals(todayDate),
          fetchWaterIntake(todayDate),
          fetchWeeklySummary(),
          fetchExerciseData(todayDate),
          fetchWeightHistory(),
        ]);

        // 3. Cache only data we just confirmed with the server.
        if (isCurrent() && profile && !profile.offline) {
          const latest = useMealStore.getState();
          await Promise.all([
            saveDataToCache(mealCacheKey(todayDate), latest.meals),
            water.isDirty()
              ? Promise.resolve()
              : saveDataToCache(waterCacheKey(todayDate), latest.waterIntake),
            saveDataToCache(weeklyCacheKey, {
              weeklyHistory: latest.weeklyHistory,
              weeklyAiInsight: latest.weeklyAiInsight,
            }),
          ]);
        }
      };

      loadDashboardData().catch((error) =>
        console.warn("Dashboard load issue:", error?.message),
      );

      return () => {
        isMounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshUserProfile, userId]),
  );

  const handleWaterChange = (delta) => water.set((current) => current + delta);

  const handleDeleteMeal = async (mealId, mealName) => {
    try {
      const res = await deleteMeal(mealId);
      if (res?.success) {
        Alert.alert("Success", `"${mealName}" deleted successfully!`);
        if (fetchTodayMeals) {
          fetchTodayMeals(getLocalDate());
        }
      } else {
        Alert.alert("Error", res?.message || "Could not delete meal.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred while deleting.");
    }
  };

  const calorieGoal =
    Number(user?.dailyCalorieTarget || user?.dailyCalorieGoal) || 2000;
  const currentEaten = Math.round(Number(totalCalories) || 0);
  const remainingCal = Math.max(0, calorieGoal - currentEaten);
  const excessKcal = Math.max(0, currentEaten - calorieGoal);
  const isExceeded = excessKcal > 0;
  const isPro = isActiveProUser(user);
  const planLabel = getPlanLabel(user);
  const bmiInfo = getBmiInfo(user?.weight, user?.height);
  const bmiColor = bmiInfo
    ? bmiInfo.category === "Obese"
      ? colors.danger
      : BMI_COLORS[bmiInfo.category] || colors.primary
    : colors.primary;

  // Clear a previous suggestion when the excess changes (new meal logged).
  useEffect(() => {
    setAiRecoveryTip(null);
  }, [excessKcal, userId]);

  // Personalised recovery suggestion (goal, diet preference, time of day,
  // today's meals). The server falls back to rule-based advice if AI is down.
  const handleFetchAiRecovery = async () => {
    if (recoveryLoading) return;
    setRecoveryLoading(true);
    const offlineTip = `You're ${formatKcal(excessKcal)} kcal over today, which is completely recoverable. Keep your next meal light and protein-focused with plenty of vegetables, drink water instead of sugary drinks, and go back to your normal plan tomorrow. There's no need to skip meals.`;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/meals/recovery-guidance`,
        {
          consumedCalories: currentEaten,
          excessKcal,
          date: getLocalDate(),
          localHour: new Date().getHours(),
          dietPreference: user?.dietPreference || "",
        },
        authHeaders,
      );
      if (!isStillActiveUser()) return;
      setAiRecoveryTip(
        res.data?.success && res.data.data?.guidance
          ? {
              text: res.data.data.guidance,
              source: res.data.data.source || "rule",
            }
          : { text: offlineTip, source: "offline" },
      );
    } catch (err) {
      if (isStillActiveUser()) {
        setAiRecoveryTip({ text: offlineTip, source: "offline" });
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text
              style={[styles.userName, { color: colors.text }]}
              numberOfLines={1}
            >
              {user?.name || "User Name"}
            </Text>
          </View>

          <View style={styles.headerBadges}>
            <TouchableOpacity
              style={[
                styles.badge,
                {
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => navigation.navigate("Achievements")}
            >
              <Ionicons
                name="trophy"
                size={14}
                color={colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                Badges
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.badge,
                { backgroundColor: isPro ? "#F59E0B" : colors.primary },
              ]}
              onPress={() => {
                if (!isPro) {
                  navigation.navigate("SubscriptionScreen");
                }
              }}
            >
              <Text style={styles.badgeText}>{planLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <StreakHeader streakCount={user?.streakCount || 1} colors={colors} />

        {/* BMI: text column shrinks, score badge never does, so the badge
            can't be pushed past the card's right edge on narrow screens. */}
        <NeonCard style={styles.bmiRow}>
          <View style={styles.bmiInfo}>
            <Ionicons name="body-outline" size={22} color={colors.primary} />
            <View style={styles.bmiTextCol}>
              <Text
                style={[styles.cardTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                Your BMI
              </Text>
              <Text
                style={{ color: colors.textSecondary, fontSize: 11 }}
                numberOfLines={2}
              >
                Estimate from your profile height and weight
              </Text>
            </View>
          </View>
          {bmiInfo ? (
            <View
              style={[
                styles.bmiBadge,
                { backgroundColor: colors.glassGlow, borderColor: bmiColor },
              ]}
              accessibilityLabel={`BMI ${bmiInfo.value}, ${bmiInfo.category}`}
            >
              <Text
                style={[styles.bmiValue, { color: bmiColor }]}
                numberOfLines={1}
              >
                {bmiInfo.value.toFixed(1)}
              </Text>
              <Text
                style={[styles.bmiCategory, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {bmiInfo.category}
              </Text>
            </View>
          ) : (
            <Text
              style={{ color: colors.textSecondary, fontSize: 12, flexShrink: 0 }}
            >
              Add height and weight
            </Text>
          )}
        </NeonCard>

        {/* Calorie Deviation Alert & AI Recovery Assistant Trigger */}
        {isExceeded && (
          <NeonCard
            accent="red"
            active
            style={[styles.alertCard, { backgroundColor: colors.dangerBg }]}
          >
            <Ionicons name="warning" size={22} color={colors.danger} />
            <View style={styles.alertBody}>
              <Text style={[styles.alertText, { color: colors.text }]}>
                {`Diet Deviation Alert: Exceeded goal by ${formatKcal(excessKcal)} kcal!`}
              </Text>
              <TouchableOpacity
                style={[
                  styles.recoveryBtn,
                  { backgroundColor: colors.danger, opacity: recoveryLoading ? 0.75 : 1 },
                ]}
                onPress={handleFetchAiRecovery}
                disabled={recoveryLoading}
                accessibilityRole="button"
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color="#FFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.recoveryBtnText} numberOfLines={1}>
                  {recoveryLoading
                    ? "Personalising your plan…"
                    : aiRecoveryTip
                      ? "Get another suggestion"
                      : "Ask AI Recovery Assistant"}
                </Text>
              </TouchableOpacity>
            </View>
          </NeonCard>
        )}

        {/* AI Recovery Tip Card Display */}
        {aiRecoveryTip && (
          <NeonCard active style={styles.aiRecoveryCard}>
            <View style={styles.aiRecoveryHeader}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "bold",
                  fontSize: 13,
                  flexShrink: 1,
                }}
              >
                {aiRecoveryTip.source === "ai"
                  ? "Your personalised recovery plan"
                  : "Recovery plan"}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
              {aiRecoveryTip.text}
            </Text>
            {!user?.dietPreference && (
              <Text
                style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8 }}
              >
                Tip: set your diet style in Profile for food suggestions that
                match how you eat.
              </Text>
            )}
          </NeonCard>
        )}

        {/* Water Tracker & Log Exercise Row */}
        <View style={styles.rowContainer}>
          <NeonCard
            accent="sky"
            containerStyle={styles.halfCardContainer}
            style={styles.halfCard}
          >
            <View style={styles.cardTitleRow}>
              <Ionicons name="water" size={20} color={colors.info} />
              <Text
                style={[styles.cardTitle, styles.cardTitleText, { color: colors.text }]}
                numberOfLines={1}
              >
                Water
              </Text>
            </View>
            <Text
              style={[styles.halfCardValue, { color: colors.info }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {(waterGlasses * 250).toLocaleString("en-US")} / 2,000 ml
            </Text>
            <View style={styles.waterControls}>
              <TouchableOpacity
                style={[
                  styles.smallWaterBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: waterGlasses === 0 ? 0.5 : 1,
                  },
                ]}
                onPress={() => handleWaterChange(-1)}
                disabled={waterGlasses === 0}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove one glass of water"
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </TouchableOpacity>
              <Text
                style={[styles.waterCount, { color: colors.text }]}
                numberOfLines={1}
              >
                {waterGlasses} {waterGlasses === 1 ? "glass" : "glasses"}
              </Text>
              <TouchableOpacity
                style={[styles.smallWaterBtn, { backgroundColor: colors.info }]}
                onPress={() => handleWaterChange(1)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Add one glass of water"
              >
                <Ionicons name="add" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            {water.status === "offline" && (
              <Text style={[styles.syncNote, { color: colors.warning }]}>
                Saved on device · will sync
              </Text>
            )}
          </NeonCard>

          <NeonCard
            accent="red"
            containerStyle={styles.halfCardContainer}
            style={styles.halfCard}
            onPress={() => setShowExerciseModal(true)}
            accessibilityLabel="Log exercise"
          >
            <View style={styles.cardTitleRow}>
              <Ionicons name="fitness" size={20} color={colors.danger} />
              <Text
                style={[styles.cardTitle, styles.cardTitleText, { color: colors.text }]}
                numberOfLines={1}
              >
                Exercise
              </Text>
            </View>
            <Text
              style={[styles.halfCardValue, { color: colors.danger }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatKcal(caloriesBurned)} kcal burned
            </Text>
            <View
              style={[styles.exerciseActionBtn, { backgroundColor: colors.danger }]}
            >
              <Ionicons
                name="add"
                size={14}
                color="#FFF"
                style={{ marginRight: 4 }}
              />
              <Text
                style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}
                numberOfLines={1}
              >
                Add Exercise
              </Text>
            </View>
          </NeonCard>
        </View>

        {/* Step Tracking Card */}
        <NeonCard>
          <View style={styles.stepsHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="footsteps" size={22} color={colors.primary} />
              <Text
                style={[styles.cardTitle, styles.cardTitleText, { color: colors.text }]}
                numberOfLines={1}
              >
                Steps Tracking
              </Text>
            </View>
            <Text
              style={[styles.stepsValue, { color: colors.primary }]}
              numberOfLines={1}
            >
              {stepCount.toLocaleString("en-US")} / 10,000
            </Text>
          </View>
          {steps.status === "offline" && (
            <Text style={[styles.syncNote, { color: colors.warning }]}>
              Saved on device · will sync when online
            </Text>
          )}

          <View style={styles.stepControls}>
            <TouchableOpacity
              style={[
                styles.stepAdjustButton,
                { borderColor: colors.border, backgroundColor: colors.inputBg },
              ]}
              onPress={() => handleAdjustSteps(-1)}
              disabled={stepCount === 0}
              accessibilityRole="button"
              accessibilityLabel="Remove one step"
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={[styles.stepAdjustLabel, { color: colors.textSecondary }]}
            >
              Adjust by 1 step
            </Text>
            <TouchableOpacity
              style={[
                styles.stepAdjustButton,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.glassGlow,
                },
              ]}
              onPress={() => handleAdjustSteps(1)}
              accessibilityRole="button"
              accessibilityLabel="Add one step"
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.manualStepsRow}>
            <TextInput
              style={[
                styles.manualStepsInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              accessibilityLabel="Enter today's total steps"
              placeholder="Enter today's total"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={manualStepTotal}
              onChangeText={setManualStepTotal}
            />
            <TouchableOpacity
              style={[
                styles.manualStepsButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleSetManualSteps}
            >
              <Text style={{ color: "#FFF", fontWeight: "700" }}>Set total</Text>
            </TouchableOpacity>
          </View>
        </NeonCard>

        {/* Health & Device Sync Component */}
        <DeviceSyncSection
          key={String(user?._id || user?.id || "signed-out")}
          onSyncSuccess={(syncedSteps) => {
            // Device totals are authoritative; adopt them unless the user is
            // mid-adjustment, in which case their pending total syncs next.
            if (!steps.isDirty()) steps.set(syncedSteps);
          }}
        />

        <WeightProgressCard
          colors={colors}
          entries={weightHistory}
          currentWeight={user?.weight}
          targetWeight={user?.targetWeight}
          onAddWeighIn={() => setShowWeighModal(true)}
        />
        <TouchableOpacity
          style={[styles.weighInButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowWeighModal(true)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>
            Weigh-in
          </Text>
        </TouchableOpacity>

        {/* Calorie Progress Card */}
        <NeonCard accent={isExceeded ? "red" : "green"} active={isExceeded}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Daily Calorie Summary
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNum,
                  { color: isExceeded ? colors.danger : colors.primary },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatKcal(currentEaten)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Eaten
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[styles.statNum, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatKcal(remainingCal)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Remaining
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[styles.statNum, { color: colors.textSecondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatKcal(calorieGoal)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Goal
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.historyBtn,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowHistoryModal(true)}
          >
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[styles.historyBtnText, { color: colors.text }]}>
              View Logged History ({meals?.length || 0})
            </Text>
          </TouchableOpacity>
        </NeonCard>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("LogFoodScreen")}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.actionCardText}>Log Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#3B82F6" }]}
            onPress={() => navigation.navigate("Scan Meal")}
          >
            <Ionicons name="camera-outline" size={24} color="#FFF" />
            <Text style={styles.actionCardText}>Scan Food</Text>
          </TouchableOpacity>
        </View>

        {/* AdMob Banner Component */}
        <AdBanner />
      </ScrollView>

      {/* Weigh-in Modal */}
      <Modal
        visible={showWeighModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWeighModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Your Current Weight
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter weight in KG (e.g. 74.5)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={[
                  styles.stepActionBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowWeighModal(false)}
              >
                <Text style={{ color: colors.text, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.stepActionBtn,
                  { backgroundColor: colors.primary, marginLeft: 10 },
                ]}
                onPress={handleSaveWeight}
              >
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                  Save Weight
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Logging Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Exercise & Calories
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Exercise Name (e.g. Running, Gym)"
              placeholderTextColor={colors.textSecondary}
              value={exerciseName}
              onChangeText={setExerciseName}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Calories Burned (e.g. 250)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={caloriesInput}
              onChangeText={setCaloriesInput}
            />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={[
                  styles.stepActionBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowExerciseModal(false)}
              >
                <Text style={{ color: colors.text, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.stepActionBtn,
                  { backgroundColor: "#EF4444", marginLeft: 10 },
                ]}
                onPress={handleSaveExercise}
              >
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                  Save Exercise
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Meal History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Today's Meal History
              </Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons
                  name="close-circle"
                  size={26}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {!meals || meals.length === 0 ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginVertical: 30,
                }}
              >
                No meals logged today yet.
              </Text>
            ) : (
              <FlatList
                data={meals}
                keyExtractor={(item, index) =>
                  item._id || item.id || String(index)
                }
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.historyItem,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mealName, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 12 }}
                      >
                        P: {item.protein || 0}g | C: {item.carbs || 0}g | F:{" "}
                        {item.fats || 0}g
                      </Text>
                    </View>

                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontWeight: "bold",
                          marginRight: 12,
                        }}
                      >
                        {item.calories} kcal
                      </Text>
                      <TouchableOpacity
                        style={{ padding: 6 }}
                        onPress={() =>
                          handleDeleteMeal(item._id || item.id, item.name)
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  greeting: { fontSize: 13 },
  userName: { fontSize: 18, fontWeight: "bold" },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  cardTitleText: { marginLeft: 6, flexShrink: 1 },
  bmiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  bmiInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  bmiTextCol: { marginLeft: 10, flex: 1, minWidth: 0 },
  alertBody: { flex: 1, minWidth: 0, marginLeft: 8 },
  aiRecoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  halfCardContainer: { width: "48.5%" },
  halfCardValue: { fontWeight: "bold", marginVertical: 6, fontSize: 13 },
  waterControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  waterCount: {
    fontWeight: "bold",
    fontSize: 13,
    flexShrink: 1,
    textAlign: "center",
  },
  syncNote: { fontSize: 10, marginTop: 6 },
  stepsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  stepsValue: { fontWeight: "bold", flexShrink: 0 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  alertCard: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  alertText: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  recoveryBtn: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  recoveryBtnText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  aiRecoveryCard: { padding: 14 },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 12,
  },
  halfCard: { padding: 12, marginBottom: 0 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold" },
  smallWaterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseActionBtn: {
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  stepActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  stepControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 12,
  },
  stepAdjustButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepAdjustLabel: { fontSize: 12, fontWeight: "600" },
  manualStepsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  manualStepsInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  manualStepsButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bmiBadge: {
    minWidth: 76,
    maxWidth: 110,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  bmiValue: { fontSize: 17, fontWeight: "800" },
  bmiCategory: { fontSize: 10, fontWeight: "600", marginTop: 1 },
  weighInButton: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 14,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNum: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 11, marginTop: 2 },
  historyBtn: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  historyBtnText: { fontWeight: "bold", fontSize: 13 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionCardText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  historyItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 8,
  },
  mealName: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
});
