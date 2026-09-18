import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { getThemeColors } from "../theme/colors";
import { useAuthStore } from "../store/useAuthStore";

const TARGETS = { calories: 2000, protein: 140, carbs: 220, fats: 65 };
const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app"}/api`;

export default function DashboardScreen({ navigation }) {
  // Auth store se token aur user ko get kar rahe hain
  const { theme, token, user } = useAuthStore();
  const colors = getThemeColors(theme);
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

  const fetchDashboardData = async () => {
    // Auth token check
    const authToken = token || user?.token;

    if (!authToken) {
      console.warn("No token found. User needs to login again.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Request headers mein Authorization Bearer token attach kar diya hai
      const config = {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };

      const [dailyRes, weeklyRes] = await Promise.all([
        axios.get(`${BASE_URL}/meals/daily-summary`, config),
        axios.get(`${BASE_URL}/meals/weekly-summary`, config),
      ]);

      if (dailyRes.data?.success) setDailySummary(dailyRes.data.data.summary);
      if (weeklyRes.data?.success) setWeeklyData(weeklyRes.data.data);
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
    }, [token, user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View
      style={[styles.rootContainer, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          <Ionicons name="stats-chart" size={24} color={colors.accent} />
        </View>

        {/* Daily Macros Overview */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Today's Macros
          </Text>

          <ProgressBarItem
            label="Calories"
            current={dailySummary.calories}
            target={TARGETS.calories}
            unit="kcal"
            color="#3b82f6"
            colors={colors}
            isDark={isDark}
          />
          <ProgressBarItem
            label="Protein"
            current={dailySummary.protein}
            target={TARGETS.protein}
            unit="g"
            color="#ef4444"
            colors={colors}
            isDark={isDark}
          />
          <ProgressBarItem
            label="Carbs"
            current={dailySummary.carbs}
            target={TARGETS.carbs}
            unit="g"
            color="#f59e0b"
            colors={colors}
            isDark={isDark}
          />
          <ProgressBarItem
            label="Fats"
            current={dailySummary.fats}
            target={TARGETS.fats}
            unit="g"
            color="#10b981"
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Weekly Trend */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Weekly Calories Trend
          </Text>
          {weeklyData.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subText }]}>
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
                    <Text style={[styles.barValue, { color: colors.subText }]}>
                      {Math.round(item.calories)}
                    </Text>
                    <View
                      style={[
                        styles.barBackground,
                        { backgroundColor: colors.inputBg },
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
                                : colors.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.subText }]}>
                      {dayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const ProgressBarItem = ({
  label,
  current,
  target,
  unit,
  color,
  colors,
  isDark,
}) => {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.subText }]}>
          {Math.round(current)} / {target} {unit} ({percentage}%)
        </Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.inputBg }]}>
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
  rootContainer: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 50 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "bold" },
  card: { borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  macroRow: { marginBottom: 14 },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroLabel: { fontSize: 14, fontWeight: "500" },
  macroValue: { fontSize: 13 },
  progressBg: { height: 10, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  emptyText: { textAlign: "center", paddingVertical: 20 },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    paddingTop: 20,
  },
  barWrapper: { alignItems: "center", flex: 1 },
  barValue: { fontSize: 10, marginBottom: 4 },
  barBackground: {
    height: 120,
    width: 14,
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 7 },
  barLabel: { fontSize: 11, marginTop: 6 },
});
