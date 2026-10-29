import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "../store/useAuthStore";
import { useMealStore } from "../store/useMealStore";
import { calculateBMI } from "../utils/bmi";
import WaterTracker from "../components/WaterTracker";
import CalorieChart from "../components/CalorieChart";
import StreakHeader from "../components/StreakHeader";
import { getThemeColors } from "../theme/colors";

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Store Hooks
  const { user, logout, theme } = useAuthStore();
  const colors = getThemeColors(theme);

  const {
    todaySummary,
    todayMeals,
    weeklyHistory,
    fetchDailySummary,
    fetchWeeklySummary,
    fetchWaterIntake,
    deleteMeal,
    updateMeal,
    setSelectedDate,
  } = useMealStore();

  // Recovery Coach Modal State
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  // Date Formatter Utility (YYYY-MM-DD)
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Consolidated Data Fetcher
  const loadData = useCallback(
    async (targetDate = currentDate) => {
      try {
        const formattedDate = formatDate(targetDate);
        if (setSelectedDate) setSelectedDate(formattedDate);

        await Promise.all([
          fetchDailySummary && fetchDailySummary(formattedDate),
          fetchWeeklySummary && fetchWeeklySummary(),
        ]);

        if (typeof fetchWaterIntake === "function") {
          await fetchWaterIntake(formattedDate);
        }
      } catch (error) {
        console.error("Error refreshing dashboard data:", error);
      }
    },
    [
      currentDate,
      fetchDailySummary,
      fetchWeeklySummary,
      fetchWaterIntake,
      setSelectedDate,
    ],
  );

  // Refresh Control Handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(currentDate);
    setRefreshing(false);
  };

  // Screen Focus Data Fetching
  useFocusEffect(
    useCallback(() => {
      loadData(currentDate);
    }, [loadData, currentDate]),
  );

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
    loadData(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    if (next > new Date()) return;
    setCurrentDate(next);
    loadData(next);
  };

  const isToday = formatDate(currentDate) === formatDate(new Date());

  // Edit Modal & Form State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFats, setEditFats] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal Action Handlers
  const handleOpenEdit = (item) => {
    setSelectedMealId(item._id || item.id);
    setEditName(item.name || "");
    setEditCalories(String(item.calories || 0));
    setEditProtein(String(item.protein || 0));
    setEditCarbs(String(item.carbs || 0));
    setEditFats(String(item.fats || 0));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editCalories) {
      Alert.alert("Validation Error", "Name and Calories are required fields.");
      return;
    }

    setLoading(true);
    const updatedValues = {
      name: editName.trim(),
      calories: Number(editCalories) || 0,
      protein: Number(editProtein) || 0,
      carbs: Number(editCarbs) || 0,
      fats: Number(editFats) || 0,
    };

    const res = await updateMeal(selectedMealId, updatedValues);
    setLoading(false);

    if (res?.success) {
      setIsEditModalOpen(false);
      await loadData(currentDate);
      Alert.alert("Success", "Meal updated successfully!");
    } else {
      Alert.alert("Error", res?.message || "Failed to update meal.");
    }
  };

  // Delete Meal Handler
  const handleDeleteMeal = (item) => {
    const mealId = item._id || item.id;
    if (!mealId) {
      Alert.alert("Error", "Meal ID is missing.");
      return;
    }

    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteMeal(mealId);
              if (res?.success) {
                await loadData(currentDate);
              } else {
                Alert.alert("Error", res?.message || "Failed to delete meal.");
              }
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to delete meal.");
            }
          },
        },
      ],
    );
  };

  // Calorie & Macro Calculations
  const bmiData = calculateBMI(user?.weight, user?.height);
  const dailyCalories = user?.dailyCalorieGoal || user?.dailyCalories || 2000;
  const consumedCalories = todaySummary?.calories || 0;
  const remainingCalories = dailyCalories - consumedCalories;

  // Diet Deviation Threshold Check
  const isDeviated = consumedCalories > dailyCalories;
  const excessCalories = isDeviated ? consumedCalories - dailyCalories : 0;

  const protein = user?.macros?.protein || 150;
  const carbs = user?.macros?.carbs || 200;
  const fats = user?.macros?.fats || 65;

  return (
    <SafeAreaView
      style={[styles.safeContainer, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome back 👋
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name || "User"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate("Achievements")}
              activeOpacity={0.7}
            >
              <Ionicons name="trophy" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate("ProfileScreen")}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.logoutBtn,
                { backgroundColor: colors.cardBg, borderColor: "#ff4d4d" },
              ]}
              onPress={logout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Header Component */}
        <View style={{ paddingHorizontal: 20 }}>
          <StreakHeader streakCount={user?.streakCount || 1} colors={colors} />
        </View>

        {/* Dashboard Title & BMI */}
        <View style={styles.goalHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Dashboard Summary
          </Text>
          {bmiData && (
            <View
              style={[
                styles.bmiBadge,
                {
                  backgroundColor: bmiData.color + "22",
                  borderColor: bmiData.color,
                },
              ]}
            >
              <Text style={[styles.bmiBadgeText, { color: bmiData.color }]}>
                BMI: {bmiData.bmi}
              </Text>
            </View>
          )}
        </View>

        {/* Date Selector Strip */}
        <View
          style={[
            styles.dateSelector,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={handlePrevDay}
            style={styles.dateArrowBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.dateArrowText, { color: colors.primary }]}>
              ◀
            </Text>
          </TouchableOpacity>

          <Text style={[styles.dateText, { color: colors.text }]}>
            {isToday ? "Today, " : ""}
            {currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>

          <TouchableOpacity
            onPress={handleNextDay}
            disabled={isToday}
            style={[styles.dateArrowBtn, isToday && { opacity: 0.3 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.dateArrowText, { color: colors.primary }]}>
              ▶
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🚨 DIET DEVIATION RED ALERT CARD */}
        {isDeviated && (
          <View
            style={[styles.deviationCard, { backgroundColor: colors.cardBg }]}
          >
            <View style={styles.deviationHeader}>
              <View
                style={[
                  styles.deviationBadge,
                  { backgroundColor: colors.inputBg },
                ]}
              >
                <Ionicons name="warning-sharp" size={16} color="#FF3B30" />
                <Text style={styles.deviationBadgeText}>Diet Breach Alert</Text>
              </View>
              <Text style={styles.excessText}>
                +{excessCalories} kcal over limit
              </Text>
            </View>

            <Text
              style={[styles.deviationSubtext, { color: colors.textSecondary }]}
            >
              You have exceeded your daily target calorie threshold. Don't
              worry, consistency matters most!
            </Text>

            <TouchableOpacity
              style={styles.recoveryCoachBtn}
              onPress={() => setIsRecoveryModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color="#FFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.recoveryCoachBtnText}>
                AI Recovery Advice
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Calorie Goal Card */}
        <View
          style={[
            styles.calorieCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            Daily Calorie Goal 🎯
          </Text>
          <View style={styles.calorieRow}>
            <View style={styles.calorieStat}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {dailyCalories}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Target
              </Text>
            </View>
            <View
              style={[
                styles.calorieDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.calorieStat}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {consumedCalories}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Eaten
              </Text>
            </View>
            <View
              style={[
                styles.calorieDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.calorieStat}>
              <Text
                style={[
                  styles.statNumber,
                  { color: remainingCalories < 0 ? "#ff4d4d" : colors.primary },
                ]}
              >
                {remainingCalories}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {remainingCalories < 0 ? "Exceeded" : "Remaining"}
              </Text>
            </View>
          </View>
        </View>

        {/* Macros Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Macros Target 📊
        </Text>
        <View style={styles.macrosRow}>
          <View
            style={[
              styles.macroCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={styles.macroEmoji}>🥩</Text>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {protein}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Protein
            </Text>
          </View>
          <View
            style={[
              styles.macroCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={styles.macroEmoji}>🍞</Text>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {carbs}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Carbs
            </Text>
          </View>
          <View
            style={[
              styles.macroCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={styles.macroEmoji}>🥑</Text>
            <Text style={[styles.macroVal, { color: colors.text }]}>
              {fats}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
              Fats
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions 🚀
        </Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.cardBg, borderColor: colors.primary },
            ]}
            onPress={() => navigation.navigate("MealScannerScreen")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Scan Meal
            </Text>
            <Text style={[styles.actionSub, { color: colors.primary }]}>
              AI Vision Scanner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              { backgroundColor: colors.cardBg, borderColor: colors.primary },
            ]}
            onPress={() => navigation.navigate("LogFoodScreen")}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Log Food
            </Text>
            <Text style={[styles.actionSub, { color: colors.primary }]}>
              Manual Entry
            </Text>
          </TouchableOpacity>
        </View>

        {/* Water Tracker & Weekly Calorie Chart */}
        <WaterTracker date={formatDate(currentDate)} />
        <CalorieChart
          targetCalories={dailyCalories}
          historyData={weeklyHistory}
        />

        {/* Logged Meals List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Meals 🍽️
        </Text>
        {todayMeals && todayMeals.length > 0 ? (
          todayMeals.map((item, index) => (
            <View
              key={item._id || item.id || index}
              style={[
                styles.mealCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.mealName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.mealDetails, { color: colors.textSecondary }]}
                >
                  {item.calories} kcal | P: {item.protein || 0}g C:{" "}
                  {item.carbs || 0}g F: {item.fats || 0}g
                </Text>
              </View>

              <View style={styles.mealActionBtns}>
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item)}
                  style={styles.actionIconBtn}
                >
                  <Text style={{ fontSize: 18 }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteMeal(item)}
                  style={styles.actionIconBtn}
                >
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No meals logged for this date.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating AI Chatbot Button */}
      <TouchableOpacity
        style={[styles.floatingBotBtn, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("ChatBotScreen")}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* AI Recovery Coach Modal */}
      <Modal
        visible={isRecoveryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRecoveryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              AI Recovery Coach 🩺
            </Text>
            <Text
              style={[styles.coachSubText, { color: colors.textSecondary }]}
            >
              Here is your immediate recovery plan for today's calorie
              overshoot:
            </Text>

            <View
              style={[
                styles.coachCard,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.coachPoint, { color: colors.text }]}>
                💧 Drink 500ml water to reduce bloat.
              </Text>
              <Text style={[styles.coachPoint, { color: colors.text }]}>
                🚶 20-minute light walk will boost digestion.
              </Text>
              <Text style={[styles.coachPoint, { color: colors.text }]}>
                🥗 Keep your next meal lean with high-protein greens.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: colors.primary, marginTop: 15 },
              ]}
              onPress={() => setIsRecoveryModalOpen(false)}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Got It, Let's Recover!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Meal Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Meal ✏️
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Meal Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Chicken Rice"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Calories (kcal)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editCalories}
              onChangeText={setEditCalories}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Protein (g)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editProtein}
                  onChangeText={setEditProtein}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Carbs (g)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Fats (g)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editFats}
                  onChangeText={setEditFats}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setIsEditModalOpen(false)}
                disabled={loading}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: "bold" },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: { color: "#ff4d4d", fontWeight: "bold", fontSize: 12 },

  goalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bmiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 20,
  },
  bmiBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  dateArrowBtn: { padding: 4 },
  dateArrowText: { fontSize: 16, fontWeight: "bold" },
  dateText: { fontSize: 16, fontWeight: "bold" },

  // Diet Deviation Card Styles
  deviationCard: {
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  deviationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  deviationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deviationBadgeText: { color: "#FF3B30", fontWeight: "bold", fontSize: 12 },
  excessText: { color: "#FF3B30", fontWeight: "bold", fontSize: 12 },
  deviationSubtext: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  recoveryCoachBtn: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  recoveryCoachBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },

  coachSubText: { fontSize: 13, marginBottom: 15 },
  coachCard: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  coachPoint: { fontSize: 13, fontWeight: "500" },

  calorieCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 14, marginBottom: 16 },
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  calorieStat: { alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 12, marginTop: 4 },
  calorieDivider: { width: 1, height: 30 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  macroCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
  },
  macroEmoji: { fontSize: 22, marginBottom: 6 },
  macroVal: { fontSize: 16, fontWeight: "bold" },
  macroLabel: { fontSize: 12, marginTop: 2 },

  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  actionCard: {
    flex: 0.48,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  actionIcon: { fontSize: 26, marginBottom: 8 },
  actionTitle: { fontSize: 16, fontWeight: "bold" },
  actionSub: { fontSize: 12, marginTop: 2 },

  mealCard: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
  },
  mealName: { fontSize: 16, fontWeight: "bold" },
  mealDetails: { fontSize: 12, marginTop: 4 },
  mealActionBtns: { flexDirection: "row", gap: 10 },
  actionIconBtn: { padding: 4 },

  emptyCard: {
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 20,
  },
  emptyText: { fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputLabel: { fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  floatingBotBtn: {
    position: "absolute",
    bottom: 25,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
});
