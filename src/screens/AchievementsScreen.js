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

  const unlockedBadges = Array.isArray(user.unlockedBadges)
    ? user.unlockedBadges.map((b) => (typeof b === "string" ? b : b?.badgeId))
    : [];

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
          onPress={() => navigation && navigation.goBack && navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Achievements
        </Text>
        <View style={{ width: 24 }} />
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
                  const isUnlocked = unlockedBadges.includes(badge.id);

                  return (
                    <View key={badge.id} style={styles.badgeItem}>
                      <View
                        style={[
                          styles.iconShield,
                          isUnlocked
                            ? styles.unlockedShield
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
                          size={28}
                          color={
                            isUnlocked ? colors.primary : colors.textSecondary
                          }
                        />
                        {!isUnlocked && (
                          <View
                            style={[
                              styles.lockBadge,
                              { backgroundColor: colors.cardBg },
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  categoryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
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
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  lockedShield: {
    borderWidth: 1,
    opacity: 0.7,
  },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    padding: 2,
    borderRadius: 8,
  },
  badgeTitle: {
    fontSize: 10,
    textAlign: "center",
    fontWeight: "500",
  },
});
