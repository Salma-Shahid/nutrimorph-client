import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  TouchableOpacity, // 👈 Added
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // 👈 Added for Floating Icon
import axios from "axios";
import { Colors } from "../theme/colors";
import { useAuthStore } from "../store/useAuthStore";

const AnyScreen = () => {
  const { theme } = useAuthStore(); // ✅ Access theme globally
  const isDark = theme === "dark";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}>
      <Text style={{ color: isDark ? "#ffffff" : "#0f172a" }}>
        Screen Content
      </Text>
    </View>
  );
};

// Daily Target Goals
const TARGETS = {
  calories: 2000, // kcal
  protein: 140, // grams
  carbs: 220, // grams
  fats: 65, // grams
};

// Backend URL
const BASE_URL = "http://192.168.18.113:5000/api";

export default function DashboardScreen({ navigation }) {
  // 👈 Received navigation prop
  const theme = useColorScheme() || "dark";
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailySummary, setDailySummary] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);

  // Backend Data Fetching
  const fetchDashboardData = async () => {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        axios.get(`${BASE_URL}/meals/daily-summary`),
        axios.get(`${BASE_URL}/meals/weekly-summary`),
      ]);

      if (dailyRes.data?.success) {
        setDailySummary(dailyRes.data.data.summary);
      }
      if (weeklyRes.data?.success) {
        setWeeklyData(weeklyRes.data.data);
      }
    } catch (error) {
      console.error(
        "Dashboard Fetch Error:",
        error?.response?.data || error.message,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Dynamic Theme Colors
  const bgColor = Colors[theme]?.background || (isDark ? "#121212" : "#f4f4f5");
  const textColor = Colors[theme]?.text || (isDark ? "#ffffff" : "#18181b");
  const textSecondary =
    Colors[theme]?.textSecondary || (isDark ? "#a1a1aa" : "#71717a");
  const cardBg = isDark ? "#1e1e1e" : "#ffffff";
  const borderColor = isDark ? "#27272a" : "#e4e4e7";

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: bgColor }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 90 }} // Extra space for FAB button
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={textColor}
          />
        }
      >
        <Text style={[styles.title, { color: textColor }]}>Dashboard 📊</Text>

        {/* 1. DAILY MACROS OVERVIEW CARD */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Today's Macros
          </Text>

          <ProgressBarItem
            label="Calories"
            current={dailySummary.calories}
            target={TARGETS.calories}
            unit="kcal"
            color="#3b82f6"
            textColor={textColor}
            textSecondary={textSecondary}
            isDark={isDark}
          />

          <ProgressBarItem
            label="Protein"
            current={dailySummary.protein}
            target={TARGETS.protein}
            unit="g"
            color="#ef4444"
            textColor={textColor}
            textSecondary={textSecondary}
            isDark={isDark}
          />

          <ProgressBarItem
            label="Carbs"
            current={dailySummary.carbs}
            target={TARGETS.carbs}
            unit="g"
            color="#f59e0b"
            textColor={textColor}
            textSecondary={textSecondary}
            isDark={isDark}
          />

          <ProgressBarItem
            label="Fats"
            current={dailySummary.fats}
            target={TARGETS.fats}
            unit="g"
            color="#10b981"
            textColor={textColor}
            textSecondary={textSecondary}
            isDark={isDark}
          />
        </View>

        {/* 2. WEEKLY CALORIES CHART CARD */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Weekly Calories Trend
          </Text>

          {weeklyData.length === 0 ? (
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              No weekly data logged yet.
            </Text>
          ) : (
            <View style={styles.chartContainer}>
              {weeklyData.map((item, index) => {
                const maxCal = Math.max(
                  ...weeklyData.map((d) => d.calories),
                  TARGETS.calories,
                );
                const barHeightPercent = Math.min(
                  (item.calories / maxCal) * 100,
                  100,
                );

                const dateObj = new Date(item._id);
                const dayName = isNaN(dateObj)
                  ? item._id
                  : dateObj.toLocaleDateString("en-US", { weekday: "short" });

                return (
                  <View key={index} style={styles.barWrapper}>
                    <Text style={[styles.barValue, { color: textSecondary }]}>
                      {Math.round(item.calories)}
                    </Text>
                    <View
                      style={[
                        styles.barBackground,
                        { backgroundColor: isDark ? "#2c2c2c" : "#e4e4e7" },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${barHeightPercent || 4}%`,
                            backgroundColor:
                              item.calories >= TARGETS.calories
                                ? "#ef4444"
                                : "#3b82f6",
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: textSecondary }]}>
                      {dayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 🤖 FLOATING AI CHATBOT BUTTON */}
      <TouchableOpacity
        style={styles.floatingBotBtn}
        onPress={() => navigation.navigate("ChatBotScreen")}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

// Custom Progress Bar Component
const ProgressBarItem = ({
  label,
  current,
  target,
  unit,
  color,
  textColor,
  textSecondary,
  isDark,
}) => {
  const percentage = Math.min(Math.round((current / target) * 100), 100);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={[styles.macroLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: textSecondary }]}>
          {Math.round(current)} / {target} {unit} ({percentage}%)
        </Text>
      </View>
      <View
        style={[
          styles.progressBg,
          { backgroundColor: isDark ? "#27272a" : "#e4e4e7" },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  macroRow: {
    marginBottom: 14,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  macroValue: {
    fontSize: 13,
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 20,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    paddingTop: 20,
    paddingHorizontal: 4,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    marginBottom: 4,
  },
  barBackground: {
    height: 120,
    width: 14,
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  // Floating Action Button Styles
  floatingBotBtn: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#3b82f6",
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
});
