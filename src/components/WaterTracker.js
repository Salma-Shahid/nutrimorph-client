import React, { useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
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
        <View>
          <Text style={styles.title}>Water Intake 💧</Text>
          <Text style={styles.subTitle}>
            {currentMl} / {targetMl} ml ({waterIntake}/8 glasses)
          </Text>
        </View>
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
          <Text style={styles.btnTextPrimary}>+ 1 Glass 🥛</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  subTitle: { color: "#aaa", fontSize: 12, marginTop: 2 },
  percentageText: { color: "#3B82F6", fontSize: 16, fontWeight: "bold" },
  progressBg: {
    height: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "#1d3557" },
  btnSecondary: { backgroundColor: "#2a2a2a" },
  btnDisabled: { opacity: 0.4 },
  btnTextPrimary: { color: "#60A5FA", fontWeight: "bold" },
  btnTextSecondary: { color: "#aaa", fontWeight: "bold" },
});

// Clean single named and default export
export { WaterTracker };
export default WaterTracker;
