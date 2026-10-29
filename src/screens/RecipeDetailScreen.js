import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";
import { useMealStore } from "../store/useMealStore";
import { getThemeColors } from "../theme/colors";
import axios from "axios";

export default function RecipeDetailScreen({ route, navigation }) {
  const { recipe } = route.params || {};
  const theme = useAuthStore((state) => state.theme) || "dark";
  const colors = getThemeColors(theme);
  const token = useAuthStore((state) => state.token);
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
  const fetchTodayMeals = useMealStore((state) => state.fetchTodayMeals);

  const handleAddToDiary = async () => {
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const todayDate = new Date().toLocaleDateString("en-CA");

      const res = await axios.post(
        `${BASE_URL}/api/recipes/add-to-diary`,
        { recipeId: recipe._id || recipe.id, date: todayDate },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.success) {
        Alert.alert(
          "Success 🎯",
          `"${recipe.name || recipe.title}" added to today's diary!`,
        );

        if (res.data.streakCount) {
          updateUserStats({ streakCount: res.data.streakCount });
        }
        if (fetchTodayMeals) {
          fetchTodayMeals(todayDate);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not add recipe to diary.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 150, flexGrow: 1 }}>
        {/* Banner Image & Back Button */}
        <View style={{ position: "relative" }}>
          <Image
            source={{
              uri:
                recipe?.image ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600",
            }}
            style={styles.bannerImage}
          />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Explore")}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Recipe Body */}
        <View style={{ padding: 16 }}>
          <View
            style={[
              styles.badgeContainer,
              { backgroundColor: colors.glassGlow },
            ]}
          >
            <Text style={[styles.categoryBadge, { color: colors.primary }]}>
              {recipe?.category || "High-Protein"}{" "}
              {recipe?.cuisine ? `• ${recipe.cuisine}` : ""}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {recipe?.name || recipe?.title}
          </Text>

          {/* Macros Card */}
          <View
            style={[
              styles.macrosCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.macroCol}>
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {recipe?.calories || 0}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Calories
              </Text>
            </View>
            <View style={styles.macroCol}>
              <Text
                style={{ color: colors.text, fontWeight: "bold", fontSize: 16 }}
              >
                {recipe?.protein || 0}g
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Protein
              </Text>
            </View>
            <View style={styles.macroCol}>
              <Text
                style={{ color: colors.text, fontWeight: "bold", fontSize: 16 }}
              >
                {recipe?.carbs || 0}g
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Carbs
              </Text>
            </View>
            <View style={styles.macroCol}>
              <Text
                style={{ color: colors.text, fontWeight: "bold", fontSize: 16 }}
              >
                {recipe?.fats || 0}g
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Fats
              </Text>
            </View>
          </View>

          {/* Ingredients Section */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            Ingredients 🥗
          </Text>
          {recipe?.ingredients && recipe.ingredients.length > 0 ? (
            recipe.ingredients.map((item, idx) => (
              <View key={idx} style={styles.listRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.listText, { color: colors.text }]}>
                  {item}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Standard fresh ingredients required.
            </Text>
          )}

          {/* Step-by-Step Directions */}
          <Text
            style={[
              styles.sectionHeading,
              { color: colors.text, marginTop: 20 },
            ]}
          >
            Cooking Instructions 🍳
          </Text>
          {recipe?.directions && recipe.directions.length > 0 ? (
            recipe.directions.map((step, idx) => (
              <View key={idx} style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                  Step {idx + 1}
                </Text>
                <Text style={[styles.listText, { color: colors.text }]}>
                  {step}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Mix ingredients and prepare over medium heat.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Add To Diary Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.cardBg, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleAddToDiary}
        >
          <Ionicons
            name="add-circle"
            size={20}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 15 }}>
            Add To Log
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bannerImage: { width: "100%", height: 220, backgroundColor: "#222" },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  badgeContainer: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    fontWeight: "bold",
    fontSize: 12,
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 14 },
  macrosCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  macroCol: { alignItems: "center" },
  sectionHeading: { fontSize: 17, fontWeight: "bold", marginBottom: 10 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  listText: { fontSize: 14, lineHeight: 20 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 10,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
