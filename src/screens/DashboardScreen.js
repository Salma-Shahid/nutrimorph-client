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

export default function DashboardScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);

  const {
    meals,
    totalCalories,
    fetchTodayMeals,
    waterIntake,
    fetchWaterIntake,
    updateWaterIntake,
    deleteMeal,
    weeklyHistory,
    fetchWeeklySummary,
  } = useMealStore();

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Device local date in YYYY-MM-DD format
  const getLocalDate = () => new Date().toLocaleDateString("en-CA");

  // Focus effect to sync Dashboard with database on tab switch using local date
  useFocusEffect(
    useCallback(() => {
      const todayDate = getLocalDate();
      fetchTodayMeals(todayDate);
      fetchWaterIntake(todayDate);
      fetchWeeklySummary();
    }, []),
  );

  const handleWaterChange = async (newGlasses) => {
    if (newGlasses < 0) return;
    const todayDate = getLocalDate();
    await updateWaterIntake(newGlasses, todayDate);
  };

  const handleDeleteMeal = (mealId, mealName) => {
    Alert.alert(
      "Delete Meal",
      `Are you sure you want to delete "${mealName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const res = await deleteMeal(mealId);
            if (!res.success) {
              Alert.alert("Error", res.message || "Could not delete meal.");
            } else {
              fetchTodayMeals(getLocalDate());
            }
          },
        },
      ],
    );
  };

  const calorieGoal = user?.dailyCalorieGoal || 2000;
  const remainingCal = Math.max(0, calorieGoal - (totalCalories || 0));
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
              {user?.name || "User"} 👋
            </Text>
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

        {/* Calorie Progress Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Daily Calorie Summary
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#10B981" }]}>
                {totalCalories || 0}
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

        {/* 📊 Weekly Record Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}
          >
            Weekly Calorie History
          </Text>

          {!weeklyHistory || weeklyHistory.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              No weekly data available yet.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {weeklyHistory.slice(-7).map((item) => (
                <View key={item._id} style={styles.weeklyRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {item._id}
                  </Text>
                  <Text style={{ color: "#10B981", fontWeight: "bold" }}>
                    {item.calories} kcal
                  </Text>
                </View>
              ))}
            </View>
          )}
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

      {/* 📜 Meal History & Delete Modal */}
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
  card: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "bold" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around", // 🟢 Fixed typo (was justify)
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  statItem: { flex: 1, alignItems: "center" }, // 🟢 Added flex: 1 for equal distribution
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
    width: "100%", // 🟢 Added width: 100%
    marginBottom: 14,
  },
  waterControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%", // 🟢 Added width: 100%
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
  weeklyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%", // 🟢 Added width: 100%
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#334155",
  },
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
