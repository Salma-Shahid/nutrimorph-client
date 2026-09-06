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

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Store Hooks
  const { user, logout } = useAuthStore();
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

  // Safe Local Date Formatting Utility
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Consolidated Data Fetcher
  const loadData = useCallback(async () => {
    try {
      const formattedDate = formatDate(currentDate);
      setSelectedDate(formattedDate);

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
  }, [
    currentDate,
    fetchDailySummary,
    fetchWeeklySummary,
    fetchWaterIntake,
    setSelectedDate,
  ]);

  // Pull-To-Refresh Handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Screen Focus Data Fetching
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    if (next > new Date()) return;
    setCurrentDate(next);
  };

  const isToday = formatDate(currentDate) === formatDate(new Date());

  // Modal and Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFats, setEditFats] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit Meal Handlers
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
    if (!editName || !editCalories) {
      Alert.alert("Validation Error", "Name and Calories are required fields.");
      return;
    }

    setLoading(true);
    const updatedValues = {
      name: editName,
      calories: Number(editCalories),
      protein: Number(editProtein),
      carbs: Number(editCarbs),
      fats: Number(editFats),
    };

    const res = await updateMeal(selectedMealId, updatedValues);
    setLoading(false);

    if (res?.success) {
      setIsEditModalOpen(false);
      await loadData();
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
                await loadData();
              } else {
                Alert.alert("Error", res?.message || "Failed to delete meal.");
              }
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to delete meal.");
            }
          },
        },
      ],
    );
  };

  // Macro Calculations
  const bmiData = calculateBMI(user?.weight, user?.height);
  const dailyCalories = user?.dailyCalories || 2000;
  const consumedCalories = todaySummary?.calories || 0;
  const remainingCalories = dailyCalories - consumedCalories;

  const protein = user?.macros?.protein || 150;
  const carbs = user?.macros?.carbs || 200;
  const fats = user?.macros?.fats || 65;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
            enabled={true}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("ProfileScreen")}
              activeOpacity={0.6}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.goalHeaderRow}>
          <Text style={styles.sectionTitle}>Dashboard Summary</Text>

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
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.dateArrowBtn}>
            <Text style={styles.dateArrowText}>◀</Text>
          </TouchableOpacity>

          <Text style={styles.dateText}>
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
          >
            <Text style={styles.dateArrowText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie Card */}
        <View style={styles.calorieCard}>
          <Text style={styles.cardTitle}>Daily Calorie Goal 🎯</Text>
          <View style={styles.calorieRow}>
            <View style={styles.calorieStat}>
              <Text style={styles.statNumber}>{dailyCalories}</Text>
              <Text style={styles.statLabel}>Target</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieStat}>
              <Text style={styles.statNumber}>{consumedCalories}</Text>
              <Text style={styles.statLabel}>Eaten</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieStat}>
              <Text
                style={[
                  styles.statNumber,
                  { color: remainingCalories < 0 ? "#ff4d4d" : "#4CAF50" },
                ]}
              >
                {remainingCalories}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        {/* Macros Breakdown */}
        <Text style={styles.sectionTitle}>Macros Target 📊</Text>
        <View style={styles.macrosRow}>
          <View style={styles.macroCard}>
            <Text style={styles.macroEmoji}>🥩</Text>
            <Text style={styles.macroVal}>{protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroEmoji}>🍞</Text>
            <Text style={styles.macroVal}>{carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroEmoji}>🥑</Text>
            <Text style={styles.macroVal}>{fats}g</Text>
            <Text style={styles.macroLabel}>Fats</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions 🚀</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("MealScannerScreen")}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionTitle}>Scan Meal</Text>
            <Text style={styles.actionSub}>AI Vision Scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("LogFoodScreen")}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionTitle}>Log Food</Text>
            <Text style={styles.actionSub}>Manual Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Water Intake Tracker */}
        <WaterTracker date={formatDate(currentDate)} />

        {/* Calorie Trend Chart */}
        <CalorieChart
          targetCalories={dailyCalories}
          historyData={weeklyHistory}
        />

        {/* Meals List */}
        <Text style={styles.sectionTitle}>Meals 🍽️</Text>
        {todayMeals && todayMeals.length > 0 ? (
          todayMeals.map((item) => (
            <View key={item._id || item.id} style={styles.mealCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealName}>{item.name}</Text>
                <Text style={styles.mealDetails}>
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
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No meals logged for this date.</Text>
          </View>
        )}
      </ScrollView>

      {/* 🤖 FLOATING AI CHATBOT BUTTON (Positioned correctly at root level) */}
      <TouchableOpacity
        style={styles.floatingBotBtn}
        onPress={() => navigation.navigate("ChatBotScreen")}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Edit Meal Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Meal ✏️</Text>

            <Text style={styles.inputLabel}>Meal Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Calories (kcal)</Text>
            <TextInput
              style={styles.input}
              value={editCalories}
              onChangeText={setEditCalories}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  value={editProtein}
                  onChangeText={setEditProtein}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fats (g)</Text>
                <TextInput
                  style={styles.input}
                  value={editFats}
                  onChangeText={setEditFats}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#333" }]}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#4CAF50" }]}
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
  safeContainer: { flex: 1, backgroundColor: "#121212" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    backgroundColor: "#1e1e1e",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  greeting: { color: "#aaa", fontSize: 14 },
  userName: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  logoutBtn: {
    backgroundColor: "#2a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4d4d",
  },
  logoutText: { color: "#ff4d4d", fontWeight: "bold", fontSize: 12 },

  goalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  bmiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  bmiBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  dateArrowBtn: { padding: 6 },
  dateArrowText: { color: "#4CAF50", fontSize: 16, fontWeight: "bold" },
  dateText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  calorieCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  cardTitle: { color: "#aaa", fontSize: 14, marginBottom: 16 },
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  calorieStat: { alignItems: "center" },
  statNumber: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 4 },
  calorieDivider: { width: 1, height: 30, backgroundColor: "#333" },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
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
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  macroEmoji: { fontSize: 22, marginBottom: 6 },
  macroVal: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  macroLabel: { color: "#888", fontSize: 12, marginTop: 2 },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  actionCard: {
    flex: 0.48,
    backgroundColor: "#1c3a21",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  actionIcon: { fontSize: 26, marginBottom: 8 },
  actionTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  actionSub: { color: "#4CAF50", fontSize: 12, marginTop: 2 },
  mealCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  mealName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  mealDetails: { color: "#aaa", fontSize: 12, marginTop: 4 },
  mealActionBtns: { flexDirection: "row", gap: 10 },
  actionIconBtn: { padding: 4 },
  emptyCard: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 20,
  },
  emptyText: { color: "#666", fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputLabel: { color: "#aaa", fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: "#121212",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
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
    borderRadius: 8,
  },

  floatingBotBtn: {
    position: "absolute",
    bottom: 25,
    right: 20,
    backgroundColor: "#3b82f6",
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
