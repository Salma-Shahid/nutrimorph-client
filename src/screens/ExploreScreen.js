import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore, getThemeColors } from "../store/useAuthStore";
import { useMealStore } from "../store/useMealStore";
import axios from "axios";

const CATEGORIES = [
  "All",
  "Post-Workout",
  "Pre-Workout",
  "High-Protein",
  "Immune Support",
];

export default function ExploreScreen({ navigation }) {
  const theme = useAuthStore((state) => state.theme) || "dark";
  const colors = getThemeColors(theme);
  const token = useAuthStore((state) => state.token);
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
  const fetchTodayMeals = useMealStore((state) => state.fetchTodayMeals);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Categorized Recipes from Backend
  const loadRecipes = async (category) => {
    setLoading(true);
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const catQuery =
        category !== "All" ? `?category=${encodeURIComponent(category)}` : "";

      const res = await axios.get(`${BASE_URL}/api/recipes${catQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setRecipes(res.data.recipes || res.data.data || []);
      }
    } catch (err) {
      console.log("Error loading recipes:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes(selectedCategory);
  }, [selectedCategory]);

  // Direct "Add To Diary" Action with Real-time Store Sync
  const handleAddToDiary = async (recipe) => {
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

        // Sync Streak & Today's Meals
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Explore & Recipe Library 🥗
        </Text>
      </View>

      {/* Horizontal Category Pill Selector */}
      <View style={{ height: 48, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? "#10B981" : colors.cardBg,
                    borderColor: isSelected ? "#10B981" : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={{
                    color: isSelected ? "#FFF" : colors.textSecondary,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Recipe Cards List */}
      {loading ? (
        <ActivityIndicator
          color="#10B981"
          size="large"
          style={{ marginTop: 40 }}
        />
      ) : recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="restaurant-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
            No recipes found in this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.recipeCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={() =>
                navigation.navigate("RecipeDetailScreen", { recipe: item })
              }
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri:
                    item.image ||
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600",
                }}
                style={styles.recipeImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <Text style={styles.categoryBadge}>
                    {item.category || "High-Protein"}
                  </Text>
                  <Text style={{ color: "#10B981", fontWeight: "bold" }}>
                    {item.calories} kcal
                  </Text>
                </View>

                <Text style={[styles.recipeTitle, { color: colors.text }]}>
                  {item.name || item.title}
                </Text>

                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  P: {item.protein || 0}g | C: {item.carbs || 0}g | F:{" "}
                  {item.fats || 0}g
                </Text>

                {/* Direct "Add To Diary" Button */}
                <TouchableOpacity
                  style={styles.addToDiaryBtn}
                  onPress={() => handleAddToDiary(item)}
                >
                  <Ionicons
                    name="add-circle"
                    size={18}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.addToDiaryText}>Add To Diary</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
  },
  recipeCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  recipeImage: { width: "100%", height: 160 },
  cardContent: { padding: 14 },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10B981",
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recipeTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  addToDiaryBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  addToDiaryText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  emptyState: { alignItems: "center", marginTop: 60 },
});
