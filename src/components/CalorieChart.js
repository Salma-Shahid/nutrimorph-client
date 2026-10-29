import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

export default function CalorieChart({
  targetCalories = 2000,
  historyData = [],
}) {
  const { theme } = useAuthStore();
  const colors = getThemeColors(theme);

  // Default days list agar data array empty ho
  const defaultDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Mapping dynamic history data or fallback to defaults
  const chartData = defaultDays.map((dayLabel, idx) => {
    const item = historyData[idx];
    return {
      day: item?.day || dayLabel,
      calories: item?.calories || 0,
    };
  });

  const maxCal = Math.max(...chartData.map((d) => d.calories), targetCalories);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          Weekly Calorie Trend 📈
        </Text>
        <Text style={[styles.targetText, { color: colors.textSecondary }]}>
          Target: {targetCalories} kcal
        </Text>
      </View>

      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const barHeight = Math.min((item.calories / maxCal) * 100, 100);
          const isOverGoal = item.calories > targetCalories;

          return (
            <View key={index} style={styles.barCol}>
              <Text style={[styles.calText, { color: colors.textSecondary }]}>
                {item.calories}
              </Text>

              <View
                style={[
                  styles.barTrack,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: isOverGoal ? "#EF4444" : colors.primary,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.dayLabel, { color: colors.text }]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  targetText: { fontSize: 12, fontWeight: "600" },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 20,
  },
  barCol: { alignItems: "center", flex: 1 },
  calText: { fontSize: 9, marginBottom: 4, fontWeight: "600" },
  barTrack: {
    width: 12,
    height: 80,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
    borderWidth: 1,
  },
  barFill: { width: "100%", borderRadius: 6 },
  dayLabel: { fontSize: 11, marginTop: 6, fontWeight: "600" },
});
