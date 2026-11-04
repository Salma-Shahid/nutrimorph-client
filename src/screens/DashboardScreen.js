import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { isActiveProUser } from "../utils/subscription";
import axios from "axios";

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
  const [stepCount, setStepCount] = useState(0);
  const stepCountRef = useRef(0);
  const pendingStepDeltasRef = useRef(0);
  const stepSyncQueueRef = useRef(Promise.resolve());
  const waterCountRef = useRef(waterIntake || 0);
  const waterSyncQueueRef = useRef(Promise.resolve());
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    waterCountRef.current = Math.max(0, Number(waterIntake) || 0);
  }, [waterIntake, userId]);

  // Device local date in YYYY-MM-DD format
  const getLocalDate = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };

  useEffect(() => {
    const today = getLocalDate();
    if (user?.stepUserId === userId && user?.stepCountDate === today) {
      const dailySteps = Number(user.dailySteps) || 0;
      stepCountRef.current = dailySteps;
      setStepCount(dailySteps);
      return;
    }

    stepCountRef.current = 0;
    setStepCount(0);
    if (!user?.isDeviceSynced) {
      recordDailySteps(0, today)
        .then((updatedUser) => {
          const dailySteps = updatedUser?.dailySteps || 0;
          stepCountRef.current = dailySteps;
          setStepCount(dailySteps);
        })
        .catch((error) =>
          console.error("Could not reset the local daily step count:", error),
        );
    }
  }, [
    recordDailySteps,
    userId,
    user?.dailySteps,
    user?.isDeviceSynced,
    user?.stepCountDate,
    user?.stepUserId,
  ]);

  // Fetch Exercise & Steps from backend
  const fetchExerciseData = async (date) => {
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const res = await axios.get(`${BASE_URL}/api/exercise?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activeUser = useAuthStore.getState().user;
      if (String(activeUser?._id || activeUser?.id || "") !== userId) return;
      if (res.data?.success) {
        setCaloriesBurned(res.data.data.caloriesBurned || 0);
        const updatedUser = await recordDailySteps(
          Number(res.data.data.steps) || 0,
          date,
        );
        const dailySteps = updatedUser?.dailySteps || 0;
        stepCountRef.current = dailySteps;
        setStepCount(dailySteps);
      }
    } catch (error) {
      console.log("Error fetching exercise data:", error.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const profileRefresh = await refreshUserProfile();
      if (!profileRefresh.success) {
        throw new Error(profileRefresh.message);
      }

      const todayDate = getLocalDate();
      await Promise.all([
        fetchTodayMeals(todayDate),
        fetchWaterIntake(todayDate),
        fetchWeeklySummary(),
        fetchExerciseData(todayDate),
      ]);
    } catch (error) {
      Alert.alert(
        "Refresh failed",
        error.message || "Could not refresh your dashboard data.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdjustSteps = (delta) => {
    const today = getLocalDate();
    const newTotalSteps = Math.max(0, stepCountRef.current + delta);
    if (newTotalSteps === stepCountRef.current) return;
    stepCountRef.current = newTotalSteps;
    setStepCount(newTotalSteps);
    useAuthStore.getState().setDailySteps(newTotalSteps, today);
    if (!token || !userId) return;

    pendingStepDeltasRef.current += 1;
    stepSyncQueueRef.current = stepSyncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const activeUser = useAuthStore.getState().user;
        if (String(activeUser?._id || activeUser?.id || "") !== userId) return;
        const baseUrl =
          process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
        const response = await axios.post(
          `${baseUrl}/api/exercise`,
          { date: today, stepsDelta: delta },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const latestUser = useAuthStore.getState().user;
        if (
          String(latestUser?._id || latestUser?.id || "") !== userId ||
          !response.data?.userStats
        ) return;
        const serverSteps = Number(response.data.userStats.dailySteps) || 0;
        await updateUserStats({
          ...response.data.userStats,
          dailySteps: serverSteps,
          stepCountDate: today,
          stepUserId: userId,
        });
        if (pendingStepDeltasRef.current === 1) {
          stepCountRef.current = serverSteps;
          setStepCount(serverSteps);
          await useAuthStore.getState().setDailySteps(serverSteps, today);
        }
      })
      .catch((error) => {
        console.error(
          "Could not sync manual step adjustment:",
          error?.response?.data?.message || error.message,
        );
      })
      .finally(() => {
        pendingStepDeltasRef.current = Math.max(
          0,
          pendingStepDeltasRef.current - 1,
        );
      });
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

  // Connect Device Handler with confirmation prompt
  const handleConnectDevice = () => {
    Alert.alert(
      "Connect Fitness Provider",
      "NutriMorph needs permission to read your step count and daily active calories from Google Fit / Apple Health.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Allow & Connect",
          onPress: () => {
            Alert.alert(
              "Success",
              "Google Fit / Apple Health connected successfully! Steps will sync automatically.",
            );
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadDashboardData = async () => {
        const todayDate = getLocalDate();
        try {
          await Promise.all([
            refreshUserProfile(),
            fetchTodayMeals(todayDate),
            fetchWaterIntake(todayDate),
            fetchWeeklySummary(),
            fetchExerciseData(todayDate),
          ]);

          if (isMounted) {
            const currentMeals = useMealStore.getState().meals;
            const currentWater = useMealStore.getState().waterIntake;
            const currentWeekly = useMealStore.getState().weeklyHistory;
            const currentInsight = useMealStore.getState().weeklyAiInsight;

            await saveDataToCache(mealCacheKey(todayDate), currentMeals);
            await saveDataToCache(waterCacheKey(todayDate), currentWater);
            await saveDataToCache(weeklyCacheKey, {
              weeklyHistory: currentWeekly,
              weeklyAiInsight: currentInsight,
            });
          }
        } catch (error) {
          console.warn(
            "Dashboard refresh failed; attempting to load cached data.",
          );
          if (isMounted) {
            await getDataFromCache(mealCacheKey(todayDate));
            await getDataFromCache(waterCacheKey(todayDate));
            await getDataFromCache(weeklyCacheKey);
          }
        }
      };

      loadDashboardData();

      return () => {
        isMounted = false;
      };
    }, [refreshUserProfile, userId]),
  );

  const handleWaterChange = (delta) => {
    const newGlasses = Math.max(
      0,
      Math.floor(Number(waterCountRef.current) || 0) + delta,
    );
    if (newGlasses === waterCountRef.current) return;
    waterCountRef.current = newGlasses;
    const todayDate = getLocalDate();
    useMealStore.setState({ waterIntake: newGlasses });

    waterSyncQueueRef.current = waterSyncQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const res = await updateWaterIntake(newGlasses, todayDate);
        if (!res?.success) {
          throw new Error(res?.message || "Could not update water intake.");
        }
        const badges = res.unlockedBadges || res.data?.unlockedBadges;
        if (badges) updateUserStats({ unlockedBadges: badges });
        await saveDataToCache(waterCacheKey(todayDate), newGlasses);
      })
      .catch((error) => {
        console.error("Could not sync water intake:", error.message);
        fetchWaterIntake(todayDate);
      });
  };

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

  // AI Recovery Assistant Handler when diet limit is exceeded
  const handleFetchAiRecovery = async () => {
    setRecoveryLoading(true);
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const res = await axios.post(
        `${BASE_URL}/api/meals/recovery-guidance`,
        { consumedCalories: currentEaten, targetCalories: calorieGoal },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.success) {
        setAiRecoveryTip(
          res.data.data?.guidance ||
            res.data.advice ||
            `You have exceeded your daily calorie goal by ${Math.max(0, currentEaten - calorieGoal)} kcal. Return to your usual balanced routine tomorrow without skipping meals or overexercising.`,
        );
      }
    } catch (err) {
      setAiRecoveryTip(
        `You have exceeded your daily calorie goal by ${Math.max(0, currentEaten - calorieGoal)} kcal. There is no need to skip meals or overexercise. Return to your usual balanced routine tomorrow.`,
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  const calorieGoal =
    user?.dailyCalorieTarget || user?.dailyCalorieGoal || 2000;
  const currentEaten = totalCalories || 0;
  const remainingCal = Math.max(0, calorieGoal - currentEaten);
  const isExceeded = currentEaten > calorieGoal;
  const isPro = isActiveProUser(user);

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
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || "User Name"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
              <Text style={styles.badgeText}>{isPro ? "PRO" : "FREE"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <StreakHeader streakCount={user?.streakCount || 1} colors={colors} />

        {/* Calorie Deviation Alert & AI Recovery Assistant Trigger */}
        {isExceeded && (
          <View
            style={[
              styles.alertCard,
              { backgroundColor: colors.cardBg, borderColor: "#EF4444" },
            ]}
          >
            <Ionicons name="warning" size={22} color="#EF4444" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.alertText, { color: colors.text }]}>
                Diet Deviation Alert: Exceeded goal by{""}
                {currentEaten - calorieGoal} kcal!
              </Text>
              <TouchableOpacity
                style={[styles.recoveryBtn, { backgroundColor: "#EF4444" }]}
                onPress={handleFetchAiRecovery}
                disabled={recoveryLoading}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color="#FFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.recoveryBtnText}>
                  {recoveryLoading
                    ? "Generating AI Rescue..."
                    : "Ask AI Recovery Assistant"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Recovery Tip Card Display */}
        {aiRecoveryTip && (
          <View
            style={[
              styles.aiRecoveryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.primary },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
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
                }}
              >
                NutriMorph AI Recovery Plan
              </Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
              {aiRecoveryTip}
            </Text>
          </View>
        )}

        {/* Water Tracker & Log Exercise Row */}
        <View style={styles.rowContainer}>
          <View
            style={[
              styles.halfCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="water" size={20} color="#38BDF8" />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.text, marginLeft: 6 },
                ]}
              >
                Water Tracker
              </Text>
            </View>
            <Text
              style={{
                color: "#38BDF8",
                fontWeight: "bold",
                marginVertical: 6,
              }}
            >
              {(waterIntake || 0) * 250} / 2000 ml
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.smallWaterBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleWaterChange(-1)}
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontWeight: "bold" }}>
                {waterIntake || 0} Glasses
              </Text>
              <TouchableOpacity
                style={[styles.smallWaterBtn, { backgroundColor: "#38BDF8" }]}
                onPress={() => handleWaterChange(1)}
              >
                <Ionicons name="add" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.halfCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="fitness" size={20} color="#EF4444" />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.text, marginLeft: 6 },
                ]}
              >
                Log Exercise
              </Text>
            </View>
            <Text
              style={{
                color: "#EF4444",
                fontWeight: "bold",
                marginVertical: 6,
              }}
            >
              {caloriesBurned} Calories Burned
            </Text>
            <TouchableOpacity
              style={styles.exerciseActionBtn}
              onPress={() => setShowExerciseModal(true)}
            >
              <Ionicons
                name="add"
                size={14}
                color="#FFF"
                style={{ marginRight: 4 }}
              />
              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}>
                Add Exercise
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step Tracking Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="footsteps" size={22} color={colors.primary} />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.text, marginLeft: 8 },
                ]}
              >
                Steps Tracking
              </Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              {stepCount} / 10,000 steps
            </Text>
          </View>

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
            <Text style={[styles.stepAdjustLabel, { color: colors.textSecondary }]}>
              Adjust by 1 step
            </Text>
            <TouchableOpacity
              style={[
                styles.stepAdjustButton,
                { borderColor: colors.primary, backgroundColor: colors.glassGlow },
              ]}
              onPress={() => handleAdjustSteps(1)}
              accessibilityRole="button"
              accessibilityLabel="Add one step"
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Health & Device Sync Component */}
        <DeviceSyncSection
          key={String(user?._id || user?.id || "signed-out")}
          colors={colors}
          onSyncSuccess={(syncedSteps) => {
            stepCountRef.current = syncedSteps;
            setStepCount(syncedSteps);
          }}
        />

        {/* Weight Loss Progress Graph Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Track your Loss
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            Log Weight & monitor your target trajectory!
          </Text>
          <View
            style={[
              styles.graphPlaceholder,
              { backgroundColor: colors.glassGlow },
            ]}
          >
            <View
              style={[
                styles.targetLineBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "bold" }}>
                Target: {user?.targetWeight || 75} KG
              </Text>
            </View>
            <Ionicons
              name="analytics"
              size={48}
              color={colors.primary}
              style={{ opacity: 0.8, marginVertical: 10 }}
            />
          </View>
          <TouchableOpacity
            style={[styles.weighInBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowWeighModal(true)}
          >
            <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 14 }}>
              Weigh-in
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calorie Progress Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: isExceeded ? "#EF4444" : colors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Daily Calorie Summary
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statNum,
                  { color: isExceeded ? "#EF4444" : colors.primary },
                ]}
              >
                {currentEaten}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Eaten
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>
                {remainingCal}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Remaining
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.textSecondary }]}>
                {calorieGoal}
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
        </View>

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
                onPress={() => {
                  Alert.alert(
                    "Success",
                    `Weight successfully updated to ${newWeight} KG!`,
                  );
                  setShowWeighModal(false);
                  setNewWeight("");
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                  Save Weight
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
                        P: {item.protein || 0}g | C: {item.carbs || 0}g | F:{""}
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
  },
  greeting: { fontSize: 13 },
  userName: { fontSize: 18, fontWeight: "bold" },
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
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
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
  aiRecoveryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  halfCard: {
    width: "48%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
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
    backgroundColor: "#EF4444",
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
  graphPlaceholder: {
    height: 110,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
    position: "relative",
  },
  targetLineBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  weighInBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
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
