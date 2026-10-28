import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
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
import axios from "axios";

export default function DashboardScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
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

  // 🟢 Exercise & Steps State
  const [stepCount, setStepCount] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);

  // Device local date in YYYY-MM-DD format
  const getLocalDate = () => new Date().toLocaleDateString("en-CA");

  // Fetch Exercise & Steps from backend
  const fetchExerciseData = async (date) => {
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const res = await axios.get(`${BASE_URL}/api/exercise?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setStepCount(res.data.data.steps || 0);
        setCaloriesBurned(res.data.data.caloriesBurned || 0);
      }
    } catch (error) {
      console.log("Error fetching exercise data:", error.message);
    }
  };

  // Add Steps Handler
  const handleAddSteps = async () => {
    const todayDate = getLocalDate();
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const res = await axios.post(
        `${BASE_URL}/api/exercise`,
        { date: todayDate, steps: 500 }, // Adds 500 steps on click for demo/tracking
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.success) {
        setStepCount(res.data.data.steps);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update steps");
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadDashboardData = async () => {
        const todayDate = getLocalDate();
        try {
          await Promise.all([
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

            await saveDataToCache(`meals_${todayDate}`, currentMeals);
            await saveDataToCache(`water_${todayDate}`, currentWater);
            await saveDataToCache(`weekly_summary`, {
              weeklyHistory: currentWeekly,
              weeklyAiInsight: currentInsight,
            });
          }
        } catch (error) {
          console.log(
            "⚠️ Network offline or failed. Loading Dashboard from local cache...",
          );
          if (isMounted) {
            await getDataFromCache(`meals_${todayDate}`);
            await getDataFromCache(`water_${todayDate}`);
            await getDataFromCache(`weekly_summary`);
          }
        }
      };

      loadDashboardData();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const handleWaterChange = async (newGlasses) => {
    if (newGlasses < 0) return;
    const todayDate = getLocalDate();

    const res = await updateWaterIntake(newGlasses, todayDate);
    const badges = res?.unlockedBadges || res?.data?.unlockedBadges;
    if (badges) {
      updateUserStats({ unlockedBadges: badges });
    }

    await saveDataToCache(`water_${todayDate}`, newGlasses);
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
            "Focus on high-protein, low-calorie foods and hydrate with 500ml water for the rest of the day.",
        );
      }
    } catch (err) {
      setAiRecoveryTip(
        "💡 Rescue Tip: Keep your next meal light with leafy greens and lean protein. Drink an extra 2 glasses of water to stabilize metabolism.",
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
  const isPro = user?.subscriptionTier === "pro" || user?.isPro === true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || "User Name"} 👋
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              style={[
                styles.badge,
                {
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: "#10B981",
                },
              ]}
              onPress={() => navigation.navigate("Achievements")}
            >
              <Ionicons
                name="trophy"
                size={14}
                color="#10B981"
                style={{ marginRight: 4 }}
              />
              <Text
                style={{ color: "#10B981", fontSize: 11, fontWeight: "bold" }}
              >
                Badges
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: isPro ? "#F59E0B" : "#10B981" },
            ]}
          >
            <Text style={styles.badgeText}>{isPro ? "PRO 👑" : "FREE"}</Text>
          </View>
        </View>

        <StreakHeader streakCount={user?.streakCount || 1} colors={colors} />

        {/* 🚨 Calorie Deviation Alert & AI Recovery Assistant Trigger */}
        {isExceeded && (
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={22} color="#EF4444" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.alertText}>
                Diet Deviation Alert: Exceeded goal by{" "}
                {currentEaten - calorieGoal} kcal!
              </Text>
              <TouchableOpacity
                style={styles.recoveryBtn}
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
                    : "Ask AI Recovery Assistant 🤖"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Recovery Tip Card Display */}
        {aiRecoveryTip && (
          <View style={styles.aiRecoveryCard}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#10B981"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ color: "#10B981", fontWeight: "bold", fontSize: 13 }}
              >
                NutriMorph AI Recovery Plan
              </Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
              {aiRecoveryTip}
            </Text>
          </View>
        )}

        {/* 💧 Water Tracker & 🏋️‍♂️ Log Exercise Row */}
        <View style={styles.rowContainer}>
          {/* Water Tracker Card */}
          <View
            style={[
              styles.halfCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="water" size={20} color="#3B82F6" />
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
                color: "#3B82F6",
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
                style={styles.smallWaterBtn}
                onPress={() => handleWaterChange((waterIntake || 0) - 1)}
              >
                <Ionicons name="remove" size={16} color="#FFF" />
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontWeight: "bold" }}>
                {waterIntake || 0} Glasses
              </Text>
              <TouchableOpacity
                style={[styles.smallWaterBtn, { backgroundColor: "#3B82F6" }]}
                onPress={() => handleWaterChange((waterIntake || 0) + 1)}
              >
                <Ionicons name="add" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercise Card */}
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
              onPress={() =>
                Alert.alert(
                  "Exercise Log",
                  "Exercise tracking modal/screen active.",
                )
              }
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

        {/* 👟 Step Tracking Card */}
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
              <Ionicons name="footsteps" size={22} color="#10B981" />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.text, marginLeft: 8 },
                ]}
              >
                Steps Tracking
              </Text>
            </View>
            <Text style={{ color: "#10B981", fontWeight: "bold" }}>
              {stepCount} / 10,000 steps
            </Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
            <TouchableOpacity
              style={[
                styles.stepActionBtn,
                {
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: "#10B981",
                },
              ]}
              onPress={() =>
                Alert.alert(
                  "Connect Device",
                  "Google Fit / Apple Health sync ready.",
                )
              }
            >
              <Text
                style={{ color: "#10B981", fontWeight: "bold", fontSize: 12 }}
              >
                🤖 Connect Device
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepActionBtn, { backgroundColor: "#10B981" }]}
              onPress={handleAddSteps}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>
                + Add Steps
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 📈 Weight Loss Progress Graph Card (CaloVision Style Reference) */}
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
            Log Weight & monitor your target trajectory! 📉
          </Text>
          <View style={styles.graphPlaceholder}>
            <View style={styles.targetLineBadge}>
              <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "bold" }}>
                Target: {user?.targetWeight || 75} KG
              </Text>
            </View>
            <Ionicons
              name="analytics"
              size={48}
              color="#10B981"
              style={{ opacity: 0.8, marginVertical: 10 }}
            />
          </View>
          <TouchableOpacity
            style={styles.weighInBtn}
            onPress={() =>
              Alert.alert("Weigh-in", "Weight logging popup enabled.")
            }
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
                  { color: isExceeded ? "#EF4444" : "#10B981" },
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

          {/* View Logged History Button */}
          <TouchableOpacity
            style={[styles.historyBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => setShowHistoryModal(true)}
          >
            <Ionicons name="time-outline" size={18} color="#10B981" />
            <Text style={[styles.historyBtnText, { color: colors.text }]}>
              View Logged History ({meals?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: "#10B981" }]}
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
      </ScrollView>

      {/* 📜 Meal History Modal */}
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
                          color: "#10B981",
                          fontWeight: "bold",
                          marginRight: 12,
                        }}
                      >
                        {item.calories} kcal
                      </Text>
                      <TouchableOpacity
                        style={{ padding: 12 }}
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
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 13, fontWeight: "500" },
  userName: { fontSize: 20, fontWeight: "bold" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  alertCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  alertText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  recoveryBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  recoveryBtnText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  aiRecoveryCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#10B981",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  halfCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  smallWaterBtn: {
    backgroundColor: "#64748B",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseActionBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  stepActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  graphPlaceholder: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginVertical: 8,
  },
  targetLineBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  weighInBtn: {
    backgroundColor: "#10B981",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: "bold" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 12, marginTop: 4 },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  historyBtnText: { fontWeight: "600", marginLeft: 8, fontSize: 13 },
  actionRow: { flexDirection: "row", justifyContent: "space-between" },
  actionCard: {
    width: "48%",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  actionCardText: { color: "#FFF", fontWeight: "bold", marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  mealName: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
});
