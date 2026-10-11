import React, { useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMealStore } from "../store/useMealStore";

function WaterTracker({ date }) {
  const { waterIntake, updateWaterIntake, fetchWaterIntake } = useMealStore();

  useEffect(() => {
    fetchWaterIntake(date);
  }, [date]);

  const handleAddGlass = () => {
    updateWaterIntake(waterIntake + 1);
  };

  const handleRemoveGlass = () => {
    if (waterIntake > 0) {
      updateWaterIntake(waterIntake - 1);
    }
  };

  const currentMl = waterIntake * 250;
  const targetMl = 2000;
  const percentage = Math.min(Math.round((currentMl / targetMl) * 100), 100);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="water" size={22} color="#38BDF8" />
          <Text style={styles.title}>Water Tracker</Text>
        </View>
        <Text style={styles.targetText}>
          {currentMl} ml / {targetMl} ml
        </Text>
      </View>

      <View style={styles.middleRow}>
        <Text style={styles.glassesText}>
          {waterIntake} Glasses <Text style={styles.glassEmoji}>🥛</Text>
        </Text>
        <Text style={styles.percentageText}>{percentage}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>

      {/* Action Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnSecondary,
            waterIntake === 0 && styles.btnDisabled,
          ]}
          onPress={handleRemoveGlass}
          disabled={waterIntake === 0}
        >
          <Text style={styles.btnTextSecondary}>- 1 Glass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleAddGlass}
        >
          <Text style={styles.btnTextPrimary}>+ 1 Glass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { color: "#F8FAFC", fontSize: 16, fontWeight: "bold" },
  targetText: { color: "#94A3B8", fontSize: 13, fontWeight: "500" },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  glassesText: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  percentageText: { color: "#38BDF8", fontSize: 15, fontWeight: "bold" },
  progressBg: {
    height: 8,
    backgroundColor: "#334155",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 4,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#0284C7" },
  btnSecondary: { backgroundColor: "#334155" },
  btnDisabled: { opacity: 0.4 },
  btnTextPrimary: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  btnTextSecondary: { color: "#CBD5E1", fontWeight: "bold", fontSize: 13 },
});

export { WaterTracker };
export default WaterTracker;
