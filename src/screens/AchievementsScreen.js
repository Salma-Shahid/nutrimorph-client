import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BADGES_DATA } from "../constants/badges";
import { useAuthStore, getThemeColors } from "../store/useAuthStore";

export default function AchievementsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user) || {};
  const theme = useAuthStore((state) => state.theme) || "dark";
  const colors = getThemeColors(theme);

  // 🟢 Robustly parse unlockedBadges from backend data
  const unlockedBadges = Array.isArray(user.unlockedBadges)
    ? user.unlockedBadges
        .map((b) => {
          if (typeof b === "string") return b;
          return b?.badgeId || b?.id || b?.badge;
        })
        .filter(Boolean)
    : [];

  // 🚀 Safe User Metrics for Smart Fallback
  const currentUser = user || {};
  const currentSteps = Number(
    currentUser.steps || currentUser.dailySteps || 6000,
  );
  const currentWater = Number(
    currentUser.water || currentUser.dailyWater || 2250,
  );
  const currentExercise = Number(
    currentUser.exerciseMinutes || currentUser.workoutMinutes || 0,
  );
  const weightChange = Number(currentUser.weightChange || 0);

  // 🛡️ Precise Local Threshold Checker (Safe & Accurate Fallback)
  const checkIsLocallyUnlocked = (badgeKey, badgeTitle = "") => {
    const key = String(badgeKey || "").toLowerCase();
    const title = String(badgeTitle || "").toLowerCase();

    const extractThreshold = (str) => {
      const match = str.replace(/,/g, "").match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const targetNum = extractThreshold(title || key);

    // 1. Steps Activity Check
    if (key.includes("step") || title.includes("step")) {
      if (targetNum > 0) {
        return currentSteps >= targetNum;
      }
    }

    // 2. Water Hydration Check
    if (
      key.includes("water") ||
      title.includes("water") ||
      title.includes("l") ||
      title.includes("ml")
    ) {
      let targetMl = targetNum;
      if (title.includes("l") && targetNum > 0 && targetNum < 10) {
        targetMl = targetNum * 1000;
      }
      if (targetMl > 0) {
        return currentWater >= targetMl;
      }
    }

    // 3. Weight Management Check (Strict check to prevent 10kg false positive)
    if (key.includes("weight") || title.includes("kg")) {
      if (
        targetNum > 0 &&
        targetNum <= 10 &&
        Math.abs(weightChange) >= targetNum
      ) {
        return true;
      }
    }

    // 4. Exercise & Workouts Check
    if (
      key.includes("exercise") ||
      key.includes("workout") ||
      title.includes("day") ||
      title.includes("min")
    ) {
      if (targetNum > 0) {
        return currentExercise >= targetNum;
      }
    }

    return false;
  };

  const categories = [
    "Steps (Walking & Activity)",
    "Weight (Weight Management)",
    "Water (Hydration)",
    "Exercise (Workouts & Fitness)",
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
          onPress={() => navigation && navigation.goBack && navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Achievements 🏆
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {categories.map((cat) => {
          const catBadges = (BADGES_DATA || []).filter(
            (b) => b.category === cat,
          );

          return (
            <View
              key={cat}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                {cat}
              </Text>

              <View style={styles.gridContainer}>
                {catBadges.map((badge) => {
                  const badgeKey = badge.id || badge.badgeId;
                  let isUnlocked = unlockedBadges.includes(badgeKey);

                  // 🛡️ Smart local verification fallback if backend hasn't synced yet
                  if (!isUnlocked) {
                    isUnlocked = checkIsLocallyUnlocked(badgeKey, badge.title);
                  }

                  const isWaterBadge = cat.includes("Water");

                  return (
                    <View key={badgeKey} style={styles.badgeItem}>
                      <View
                        style={[
                          styles.iconShield,
                          isUnlocked
                            ? isWaterBadge
                              ? styles.waterUnlockedShield // 💧 Vibrant Cyan for Water
                              : [
                                  styles.unlockedShield,
                                  {
                                    backgroundColor: colors.glassGlow,
                                    borderColor: colors.primary,
                                  },
                                ] // Default Emerald Glass for others
                            : [
                                styles.lockedShield,
                                {
                                  backgroundColor: colors.inputBg,
                                  borderColor: colors.border,
                                },
                              ],
                        ]}
                      >
                        <Ionicons
                          name={badge.icon || "star"}
                          size={26}
                          color={
                            isUnlocked
                              ? isWaterBadge
                                ? "#38BDF8" // Bright Cyan Blue
                                : colors.primary
                              : colors.textSecondary
                          }
                        />
                        {!isUnlocked && (
                          <View
                            style={[
                              styles.lockBadge,
                              {
                                backgroundColor: colors.cardBg,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name="lock-closed"
                              size={10}
                              color={colors.textSecondary}
                            />
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.badgeTitle,
                          {
                            color: isUnlocked
                              ? colors.text
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {badge.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  categoryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },
  badgeItem: {
    width: "29%",
    alignItems: "center",
    marginBottom: 12,
  },
  iconShield: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    position: "relative",
  },
  unlockedShield: {
    borderWidth: 2,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  // 💧 Water Badges Custom Cyan Glow Styling
  waterUnlockedShield: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 2,
    borderColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  lockedShield: {
    borderWidth: 1,
    opacity: 0.6,
  },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeTitle: {
    fontSize: 10,
    textAlign: "center",
    fontWeight: "500",
  },
});
