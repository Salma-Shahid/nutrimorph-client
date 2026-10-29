import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StreakHeader({ streakCount = 1, colors }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Top Streak Row */}
      <View style={styles.streakRow}>
        <View style={styles.flameBadge}>
          <Ionicons name="flame" size={18} color="#F59E0B" />
          <Text style={styles.streakText}>
            {streakCount} {streakCount === 1 ? "Day" : "Days"} Streak!
          </Text>
        </View>

        <Text
          style={[styles.subText, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          Log daily meals to keep the flame alive 🔥
        </Text>
      </View>

      {/* Mon - Sun Tracker */}
      <View style={styles.daysRow}>
        {days.map((day, index) => {
          const isToday = index === currentDayIndex;
          const isDone =
            index <= currentDayIndex &&
            index >=
              currentDayIndex - Math.min(streakCount - 1, currentDayIndex);

          return (
            <View key={index} style={styles.dayItem}>
              <Text
                style={[
                  styles.dayText,
                  {
                    color: isToday ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {day}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isDone ? colors.primary : colors.inputBg,
                    borderColor: isToday ? colors.primary : "transparent",
                    borderWidth: isToday ? 2 : 1,
                  },
                ]}
              >
                {isDone && <Ionicons name="checkmark" size={10} color="#FFF" />}
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  flameBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    flexShrink: 0,
  },
  streakText: {
    color: "#F59E0B",
    fontWeight: "bold",
    fontSize: 12,
  },
  subText: {
    flex: 1,
    fontSize: 11,
    textAlign: "right",
    lineHeight: 14,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
