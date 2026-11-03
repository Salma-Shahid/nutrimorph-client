import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMealStore } from "../store/useMealStore";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

function WaterTracker({ date }) {
  const { waterIntake, updateWaterIntake, fetchWaterIntake } = useMealStore();
  const { theme } = useAuthStore();
  const colors = getThemeColors(theme);
  const [displayWaterIntake, setDisplayWaterIntake] = useState(waterIntake || 0);
  const waterCountRef = useRef(waterIntake || 0);
  const updateQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    fetchWaterIntake(date);
  }, [date]);

  useEffect(() => {
    const currentCount = Math.max(0, Number(waterIntake) || 0);
    waterCountRef.current = currentCount;
    setDisplayWaterIntake(currentCount);
  }, [waterIntake]);

  const handleGlassChange = (delta) => {
    const nextCount = Math.max(0, waterCountRef.current + delta);
    if (nextCount === waterCountRef.current) return;
    waterCountRef.current = nextCount;
    setDisplayWaterIntake(nextCount);
    useMealStore.setState({ waterIntake: nextCount });

    updateQueueRef.current = updateQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await updateWaterIntake(nextCount, date);
        if (!response?.success) {
          throw new Error(response?.message || "Could not update water intake.");
        }
      })
      .catch((error) => {
        console.error("Could not sync water intake:", error.message);
        fetchWaterIntake(date);
      });
  };

  const currentMl = displayWaterIntake * 250;
  const targetMl = 2000;
  const percentage = Math.min(Math.round((currentMl / targetMl) * 100), 100);

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
        <View style={styles.titleContainer}>
          <Ionicons name="water" size={22} color="#38BDF8" />
          <Text style={[styles.title, { color: colors.text }]}>
            Water Tracker
          </Text>
        </View>
        <Text style={[styles.targetText, { color: colors.textSecondary }]}>
          {currentMl} ml / {targetMl} ml
        </Text>
      </View>

      <View style={styles.middleRow}>
        <Text style={[styles.glassesText, { color: colors.text }]}>
          {displayWaterIntake} Glasses
        </Text>
        <Text style={[styles.percentageText, { color: colors.primary }]}>
          {percentage}%
        </Text>
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressBg,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.border,
              borderWidth: 1,
            },
            displayWaterIntake === 0 && styles.btnDisabled,
          ]}
          onPress={() => handleGlassChange(-1)}
          disabled={displayWaterIntake === 0}
        >
          <Text
            style={[styles.btnTextSecondary, { color: colors.textSecondary }]}
          >
            - 1 Glass
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnPrimary,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => handleGlassChange(1)}
        >
          <Text style={styles.btnTextPrimary}>+ 1 Glass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  targetText: { fontSize: 13, fontWeight: "500" },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  glassesText: { fontSize: 14, fontWeight: "600" },
  percentageText: { fontSize: 15, fontWeight: "bold" },
  progressBg: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimary: {
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnTextPrimary: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  btnTextSecondary: { fontWeight: "bold", fontSize: 13 },
});

export { WaterTracker };
export default WaterTracker;
