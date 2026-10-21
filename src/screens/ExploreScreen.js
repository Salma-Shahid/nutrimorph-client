import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app";

export default function ExploreScreen() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const token = useAuthStore((state) => state.token);

  const categories = [
    "All",
    "Pre-Workout",
    "Post-Workout",
    "High-Protein",
    "Weight Loss",
  ];

  const fetchRecipes = async (category) => {
    try {
      setLoading(true);
      const url =
        category === "All"
          ? `${BASE_URL}/api/recipes`
          : `${BASE_URL}/api/recipes?category=${category}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setRecipes(res.data.recipes);
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error("Fetch Recipes Error:", err.message);
    }
  };

  useEffect(() => {
    fetchRecipes(selectedCategory);
  }, [selectedCategory]);

  const handleAddToDiary = async (recipeId, recipeTitle) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/recipes/add-to-diary`,
        { recipeId, mealType: "Lunch" },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.success) {
        Alert.alert("Success 🎉", res.data.message);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to add recipe to diary.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Explore Recipes 🥗</Text>
      <Text style={styles.headerSubtitle}>
        Fuel your body with smart AI-recommended meals
      </Text>

      {/* Category Filter Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.catChip,
              selectedCategory === cat && styles.selectedCatChip,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.catText,
                selectedCategory === cat && styles.selectedCatText,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipe List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.recipeCard}>
              <View style={styles.recipeHeader}>
                <Text style={styles.recipeTitle}>{item.title}</Text>
                <Text style={styles.calorieBadge}>{item.calories} kcal</Text>
              </View>

              <Text style={styles.recipeCategory}>
                {item.category} • ⏱️ {item.prepTime}
              </Text>

              {/* Macros Breakdown */}
              <View style={styles.macrosRow}>
                <Text style={styles.macroText}>Protein: {item.protein}g</Text>
                <Text style={styles.macroText}>Carbs: {item.carbs}g</Text>
                <Text style={styles.macroText}>Fats: {item.fats}g</Text>
              </View>

              {/* Add to Diary Button */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddToDiary(item._id, item.title)}
              >
                <Text style={styles.addBtnText}>+ Add to Diary</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#4CAF50" },
  headerSubtitle: { fontSize: 13, color: "#AAA", marginBottom: 15 },
  categoryContainer: { maxHeight: 50, marginBottom: 15 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1E1E1E",
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#333",
    height: 40,
  },
  selectedCatChip: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  catText: { color: "#AAA", fontWeight: "600" },
  selectedCatText: { color: "#4CAF50" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 30 },
  recipeCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  recipeTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF", flex: 1 },
  calorieBadge: {
    backgroundColor: "#253B2B",
    color: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "bold",
  },
  recipeCategory: { color: "#888", fontSize: 12, marginBottom: 12 },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  macroText: { color: "#CCC", fontSize: 12, fontWeight: "500" },
  addBtn: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
});
