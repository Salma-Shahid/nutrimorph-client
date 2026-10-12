import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMealPlanStore } from "../store/useMealPlanStore";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function MealPlanScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const theme = useAuthStore((state) => state.theme);
  const colors = getThemeColors(theme);

  const { activeMealPlan, isLoading, generateMealPlan, fetchActiveMealPlan } =
    useMealPlanStore();

  const [goal, setGoal] = useState("weight_loss");
  const [dietType, setDietType] = useState("Desi / Pakistani Standard");
  const [duration, setDuration] = useState(7);
  const [targetCalories, setTargetCalories] = useState(
    user?.dailyCalorieGoal ? String(user.dailyCalorieGoal) : "2000",
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const globalDietOptions = [
    "Desi / Pakistani Standard",
    "Western Balanced",
    "Keto Diet",
    "Vegan / Plant-Based",
    "Mediterranean",
    "High Protein / Gym",
  ];

  const durationOptions = [3, 5, 7, 15, 30];

  useEffect(() => {
    fetchActiveMealPlan();
  }, []);

  const handleGenerate = async () => {
    const res = await generateMealPlan({
      goal,
      dietType,
      duration: Number(duration),
      targetCalories: Number(targetCalories) || 2000,
    });

    if (!res.success) {
      Alert.alert(
        "Pro Feature Required 🌟",
        res.message || "Please upgrade to access AI Meal Planner.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade to Pro",
            onPress: () => navigation.navigate("Subscription"), // Agar aapki paywall screen ka naam Subscription / Upgrade / Premium hai toh woh yahan likhein
          },
        ],
      );
    } else {
      Alert.alert(
        "Success",
        `Your ${duration}-day personalized meal plan is ready!`,
      );
    }
  };

  const currentDayPlan = activeMealPlan?.days?.[selectedDayIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            AI Meal Planner 🥗
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            Custom diet plans powered by Gemini AI
          </Text>
        </View>

        {/* Generator Form Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Configure Your Plan
          </Text>

          {/* Goal Selector */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Fitness Goal
          </Text>
          <View style={styles.optionsRow}>
            {[
              { id: "weight_loss", label: "Weight Loss" },
              { id: "muscle_gain", label: "Muscle Gain" },
              { id: "maintenance", label: "Maintenance" },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor:
                      goal === item.id ? "#10B981" : colors.inputBg,
                  },
                ]}
                onPress={() => setGoal(item.id)}
              >
                <Text
                  style={{
                    color: goal === item.id ? "#FFF" : colors.text,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration Selector */}
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginTop: 14, marginBottom: 8 },
            ]}
          >
            Plan Duration
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {durationOptions.map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.dietChip,
                  {
                    backgroundColor:
                      duration === days ? "#10B981" : colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setDuration(days)}
              >
                <Text
                  style={{
                    color: duration === days ? "#FFF" : colors.text,
                    fontWeight: "600",
                    fontSize: 11,
                  }}
                >
                  {days} Days
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Global Diet Preference Selector */}
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginTop: 14, marginBottom: 8 },
            ]}
          >
            Diet Preference / Cuisine
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            {globalDietOptions.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.dietChip,
                  {
                    backgroundColor:
                      dietType === type ? "#10B981" : colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setDietType(type)}
              >
                <Text
                  style={{
                    color: dietType === type ? "#FFF" : colors.text,
                    fontWeight: "600",
                    fontSize: 11,
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Dynamic Generate Button */}
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.generateBtnText}>
                  Generate {duration}-Day Plan
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Meal Plan View */}
        {activeMealPlan &&
          activeMealPlan.days &&
          activeMealPlan.days.length > 0 && (
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
                  marginBottom: 14,
                }}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Your Active Plan ({activeMealPlan.days.length} Days)
                </Text>
                <Text
                  style={{ color: "#10B981", fontWeight: "bold", fontSize: 12 }}
                >
                  {activeMealPlan.targetCalories} kcal/day
                </Text>
              </View>

              {/* Days Tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                {activeMealPlan.days.map((d, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayTab,
                      {
                        backgroundColor:
                          selectedDayIndex === index
                            ? "#10B981"
                            : colors.inputBg,
                      },
                    ]}
                    onPress={() => setSelectedDayIndex(index)}
                  >
                    <Text
                      style={{
                        color:
                          selectedDayIndex === index ? "#FFF" : colors.text,
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      {d.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Meals for Selected Day */}
              {currentDayPlan && currentDayPlan.meals && (
                <View style={{ gap: 10 }}>
                  {Object.entries(currentDayPlan.meals).map(
                    ([mealType, mealInfo]) => (
                      <View
                        key={mealType}
                        style={[
                          styles.mealItem,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.mealTypeTitle, { color: "#10B981" }]}
                          >
                            {mealType.toUpperCase()}
                          </Text>
                          <Text
                            style={[styles.mealName, { color: colors.text }]}
                          >
                            {mealInfo.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            P: {mealInfo.protein}g | C: {mealInfo.carbs}g | F:{" "}
                            {mealInfo.fats}g
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "bold",
                            fontSize: 13,
                          }}
                        >
                          {mealInfo.calories} kcal
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              )}
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "bold" },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  optionsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  dietChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  generateBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  generateBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  mealTypeTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
  mealName: { fontWeight: "bold", fontSize: 13 },
});
