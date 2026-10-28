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

  // Device local date in YYYY-MM-DD format
  const getLocalDate = () => new Date().toLocaleDateString("en-CA");

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
      console.log("Attempting to delete meal with ID:", mealId);
      const res = await deleteMeal(mealId); // deleteMeal from useMealStore
      console.log("Delete response:", res);

      if (res?.success) {
        Alert.alert("Success", `"${mealName}" deleted successfully!`);
        // Refresh today meals/summary
        if (fetchTodayMeals) {
          fetchTodayMeals(selectedDate);
        }
      } else {
        Alert.alert("Error", res?.message || "Could not delete meal.");
      }
    } catch (error) {
      console.error("Delete handler error:", error);
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
        `${BASE_URL}/api/ai/recovery-guidance`,
        { consumedCalories: currentEaten, targetCalories: calorieGoal },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.success) {
        setAiRecoveryTip(
          res.data.advice ||
            "Focus on high-protein, low-calorie foods and hydrate with 500ml water for the rest of the day.",
        );
      }
    } catch (err) {
      // Fallback smart suggestion if offline or endpoint developing
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

        {/* 💧 Water Tracker Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.waterHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="water" size={22} color="#3B82F6" />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.text, marginLeft: 8 },
                ]}
              >
                Water Tracker
              </Text>
            </View>
            <Text style={{ color: "#3B82F6", fontWeight: "bold" }}>
              {(waterIntake || 0) * 250} ml / 2000 ml
            </Text>
          </View>

          <View style={styles.waterControls}>
            <TouchableOpacity
              style={styles.waterBtn}
              onPress={() => handleWaterChange((waterIntake || 0) - 1)}
            >
              <Ionicons name="remove" size={20} color="#FFF" />
            </TouchableOpacity>

            <Text style={[styles.waterCountText, { color: colors.text }]}>
              {waterIntake || 0} Glasses 🥛
            </Text>

            <TouchableOpacity
              style={[styles.waterBtn, { backgroundColor: "#3B82F6" }]}
              onPress={() => handleWaterChange((waterIntake || 0) + 1)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
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
                        style={{ padding: 12, zIndex: 99, cursor: "pointer" }}
                        onPress={() => {
                          console.log(
                            "Delete button clicked for ID:",
                            item._id || item.id,
                          );
                          handleDeleteMeal(item._id || item.id, item.name);
                        }}
                        activeOpacity={0.7}
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
  card: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "bold" },
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
  waterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
  },
  waterControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  waterBtn: {
    backgroundColor: "#64748B",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  waterCountText: { fontSize: 16, fontWeight: "bold" },
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
