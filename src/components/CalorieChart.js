import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CalorieChart({
  targetCalories = 2000,
  historyData = [],
}) {
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
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Weekly Calorie Trend 📈</Text>
        <Text style={styles.targetText}>Target: {targetCalories} kcal</Text>
      </View>

      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const barHeight = Math.min((item.calories / maxCal) * 100, 100);
          const isOverGoal = item.calories > targetCalories;

          return (
            <View key={index} style={styles.barCol}>
              <Text style={styles.calText}>{item.calories}</Text>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: isOverGoal ? "#ff4d4d" : "#4CAF50",
                    },
                  ]}
                />
              </View>

              <Text style={styles.dayLabel}>{item.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  targetText: { color: "#888", fontSize: 12 },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 20,
  },
  barCol: { alignItems: "center", flex: 1 },
  calText: { color: "#aaa", fontSize: 9, marginBottom: 4 },
  barTrack: {
    width: 12,
    height: 80,
    backgroundColor: "#2a2a2a",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 6 },
  dayLabel: { color: "#888", fontSize: 11, marginTop: 6, fontWeight: "600" },
});
