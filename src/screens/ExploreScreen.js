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
  Modal,
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

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Late-night"];

export default function ExploreScreen({ navigation }) {
  const theme = useAuthStore((state) => state.theme) || "dark";
  const colors = getThemeColors(theme);
  const token = useAuthStore((state) => state.token);
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
  const fetchTodayMeals = useMealStore((state) => state.fetchTodayMeals);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Meal Type Modal States
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [chosenMealType, setChosenMealType] = useState("Lunch");
  const [submitting, setSubmitting] = useState(false);

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

  // Trigger Modal on "Add To Diary"
  const handleOpenMealModal = (recipe) => {
    setSelectedRecipe(recipe);
    setChosenMealType("Lunch"); // default reset
    setShowMealModal(true);
  };

  // Confirm & Send to Backend with mealType
  const handleConfirmAddToDiary = async () => {
    if (!selectedRecipe) return;
    setSubmitting(true);
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const todayDate = new Date().toLocaleDateString("en-CA");

      const res = await axios.post(
        `${BASE_URL}/api/recipes/add-to-diary`,
        {
          recipeId: selectedRecipe._id || selectedRecipe.id,
          name: selectedRecipe.name || selectedRecipe.title,
          calories: selectedRecipe.calories,
          protein: selectedRecipe.protein,
          carbs: selectedRecipe.carbs,
          fats: selectedRecipe.fats,
          date: todayDate,
          mealType: chosenMealType,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.success) {
        Alert.alert(
          "Success 🎯",
          `"${selectedRecipe.name || selectedRecipe.title}" added to ${chosenMealType}!`,
        );

        setShowMealModal(false);

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
    } finally {
      setSubmitting(false);
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
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.cardBg,
                    borderColor: isSelected ? colors.primary : colors.border,
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
          color={colors.primary}
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
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
                source={{ uri: item.image }}
                style={styles.recipeImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <View style={styles.badgeRow}>
                  <Text
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor: colors.glassGlow,
                        color: colors.primary,
                      },
                    ]}
                  >
                    {item.category || "High-Protein"}
                  </Text>
                  <Text style={{ color: colors.primary, fontWeight: "bold" }}>
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

                {/* Direct "Add To Diary" Button triggers Modal */}
                <TouchableOpacity
                  style={[
                    styles.addToDiaryBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleOpenMealModal(item)}
                >
                  <Ionicons
                    name="add-circle"
                    size={18}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.addToDiaryText}>Add To Log</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Meal Type Selection Modal */}
      <Modal
        visible={showMealModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Meal Type 🍽️
              </Text>
              <TouchableOpacity onPress={() => setShowMealModal(false)}>
                <Ionicons
                  name="close-circle"
                  size={26}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Choose which meal time this entry belongs to for smart AI
              tracking:
            </Text>

            {/* Meal Type Pills */}
            <View style={{ gap: 10, marginBottom: 20 }}>
              {MEAL_TYPES.map((type) => {
                const isSelected = chosenMealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeOption,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.inputBg,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => setChosenMealType(type)}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#FFF" : colors.text,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      {type}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFF"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleConfirmAddToDiary}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm & Add to Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  recipeImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#222",
  },
  cardContent: { padding: 14 },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recipeTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  addToDiaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addToDiaryText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  emptyState: { alignItems: "center", marginTop: 60 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  mealTypeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
});
