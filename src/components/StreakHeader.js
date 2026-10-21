import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StreakHeader({ streakCount = 1, colors }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
    >
      {/* Top Streak Row */}
      <View style={styles.streakRow}>
        <View style={styles.flameBadge}>
          <Ionicons name="flame" size={20} color="#F59E0B" />
          <Text style={styles.streakText}>{streakCount} Days Streak!</Text>
        </View>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          Log daily meals to keep the flame alive
        </Text>
      </View>

      {/* Mon - Sun Tracker */}
      <View style={styles.daysRow}>
        {days.map((day, index) => {
          const isToday = index === currentDayIndex;
          const isPassedOrToday = index <= currentDayIndex;

          return (
            <View key={index} style={styles.dayItem}>
              <Text
                style={[
                  styles.dayText,
                  { color: isToday ? "#10B981" : colors.textSecondary },
                ]}
              >
                {day}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isPassedOrToday
                      ? "#10B981"
                      : colors.inputBg,
                    borderColor: isToday ? "#10B981" : "transparent",
                    borderWidth: isToday ? 2 : 0,
                  },
                ]}
              >
                {isPassedOrToday && (
                  <Ionicons name="checkmark" size={10} color="#FFF" />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  flameBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    color: "#F59E0B",
    fontWeight: "bold",
    fontSize: 13,
  },
  subText: {
    fontSize: 11,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayItem: {
    alignItems: "center",
    gap: 6,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
});
