import React, { useState, useEffect, useRef } from "react";
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
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore, getThemeColors } from "../store/useAuthStore";
import { useMealStore } from "../store/useMealStore";
import axios from "axios";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Late-night"];

// Offline/older-backend fallback chips. Values are normalised the same way
// the server normalises (trim + lowercase), so matching is case-insensitive.
const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
const FALLBACK_CUISINES = [
  "Pakistani",
  "Indian",
  "Middle Eastern",
  "American",
  "Italian",
  "Mediterranean",
  "Mexican",
  "Asian Fusion",
  "Continental",
].map((label) => ({ value: normalize(label), label, count: null }));
const FALLBACK_CATEGORIES = [
  "High-Protein",
  "Post-Workout",
  "Pre-Workout",
  "Weight Loss",
  "Immune Support",
  "Plant-Based",
  "Vegetarian",
].map((label) => ({ value: normalize(label), label, count: null }));
// Friendlier labels for stored cuisine values.
const CUISINE_LABELS = { "middle eastern": "Arabic / Middle Eastern" };

export default function ExploreScreen({ navigation }) {
  const theme = useAuthStore((state) => state.theme) || "dark";
  const colors = getThemeColors(theme);
  const token = useAuthStore((state) => state.token);
  const updateUserStats = useAuthStore((state) => state.updateUserStats);
  const fetchTodayMeals = useMealStore((state) => state.fetchTodayMeals);

  // "" means "All" for each facet.
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [facets, setFacets] = useState({
    cuisines: FALLBACK_CUISINES,
    categories: FALLBACK_CATEGORIES,
  });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const recipeRequestId = useRef(0);
  const hasFilters = Boolean(selectedCategory || selectedCuisine || searchQuery.trim());

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedCuisine("");
    setSearchInput("");
    setSearchQuery("");
  };

  // Meal Type Modal States
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [chosenMealType, setChosenMealType] = useState("Lunch");
  const [submitting, setSubmitting] = useState(false);

  // Fetch Categorized Recipes from Backend
  const loadRecipes = async (
    category,
    cuisine,
    search,
    isRefresh = false,
  ) => {
    const requestId = ++recipeRequestId.current;
    if (!isRefresh) setLoading(true);
    try {
      const BASE_URL =
        process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
      const query = [];
      if (category) query.push(`category=${encodeURIComponent(category)}`);
      if (cuisine) query.push(`cuisine=${encodeURIComponent(cuisine)}`);
      if (search.trim()) query.push(`q=${encodeURIComponent(search.trim())}`);
      const suffix = query.length ? `?${query.join("&")}` : "";

      const res = await axios.get(`${BASE_URL}/api/recipes${suffix}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      if (res.data?.success && requestId === recipeRequestId.current) {
        setRecipes(res.data.recipes || res.data.data || []);
        setLoadError("");
        // Facets come from the actual library, so only real options show.
        if (res.data.facets?.cuisines?.length) {
          setFacets({
            cuisines: res.data.facets.cuisines,
            categories: res.data.facets.categories || FALLBACK_CATEGORIES,
          });
        }
        return true;
      }
      return res.data?.success === true;
    } catch (err) {
      if (requestId === recipeRequestId.current) {
        setLoadError(
          err?.response
            ? err.response.data?.message || "Could not load recipes."
            : "You're offline. Pull down to retry.",
        );
      }
      if (__DEV__) console.log("Error loading recipes:", err.message);
      if (isRefresh && requestId === recipeRequestId.current) {
        Alert.alert(
          "Refresh failed",
          err?.response?.data?.message || "Could not refresh recipes.",
        );
      }
      return false;
    } finally {
      if (requestId === recipeRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(
    () => () => {
      recipeRequestId.current += 1;
    },
    [],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRecipes(
        selectedCategory,
        selectedCuisine,
        searchQuery,
        true,
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    loadRecipes(selectedCategory, selectedCuisine, searchQuery);
  }, [selectedCategory, selectedCuisine, searchQuery]);

  // Trigger Modal on"Add To Diary"
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
          "Success",
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
          Explore & Recipe Library
        </Text>
      </View>

      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Search English recipe titles"
        placeholderTextColor={colors.textSecondary}
        value={searchInput}
        onChangeText={setSearchInput}
        accessibilityLabel="Search recipes by English title"
      />

      {/* One connected filter panel: cuisine + goal, with live counts. */}
      <View
        style={[
          styles.filterPanel,
          { backgroundColor: colors.cardBg, borderColor: colors.neonBorder || colors.border },
        ]}
      >
        {[
          {
            key: "cuisine",
            label: "Cuisine",
            options: facets.cuisines,
            selected: selectedCuisine,
            onSelect: setSelectedCuisine,
            labelFor: (option) => CUISINE_LABELS[option.value] || option.label,
          },
          {
            key: "category",
            label: "Goal",
            options: facets.categories,
            selected: selectedCategory,
            onSelect: setSelectedCategory,
            labelFor: (option) => option.label,
          },
        ]
          // Stable alphabetical order (counts change with every filter, which
          // made chips jump), with the active chip pinned next to "All".
          .map((group) => ({
            ...group,
            options: [...group.options].sort((a, b) => {
              if (a.value === group.selected) return -1;
              if (b.value === group.selected) return 1;
              return group.labelFor(a).localeCompare(group.labelFor(b));
            }),
          }))
          .map((group, groupIndex) => (
          <View key={group.key} style={groupIndex > 0 && styles.filterGroupGap}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              {group.label}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              {[{ value: "", label: "All", count: null }, ...group.options].map(
                (option) => {
                  const isSelected = group.selected === option.value;
                  const empty = option.count === 0 && !isSelected;
                  return (
                    <TouchableOpacity
                      key={option.value || "all"}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.inputBg,
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: empty ? 0.45 : 1,
                        },
                      ]}
                      onPress={() =>
                        group.onSelect(isSelected && option.value ? "" : option.value)
                      }
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: isSelected ? "#FFF" : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {group.labelFor(option)}
                        {typeof option.count === "number" ? (
                          <Text
                            style={{
                              color: isSelected ? "rgba(255,255,255,0.85)" : colors.textSecondary,
                              fontWeight: "600",
                            }}
                          >
                            {`  ${option.count}`}
                          </Text>
                        ) : null}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </ScrollView>
          </View>
        ))}

        <View style={styles.filterSummary}>
          <Text
            style={[styles.summaryText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {loading
              ? "Loading recipes…"
              : `${recipes.length} recipe${recipes.length === 1 ? "" : "s"}${hasFilters ? " match" : ""}`}
          </Text>
          {hasFilters && (
            <TouchableOpacity onPress={clearFilters} hitSlop={8}>
              <Text style={[styles.clearText, { color: colors.primary }]}>
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recipe Cards List */}
      {loading ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        </ScrollView>
      ) : recipes.length === 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.emptyState}>
            <Ionicons
              name="restaurant-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.text,
                marginTop: 10,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {loadError
                ? "Couldn't load recipes"
                : hasFilters
                  ? "No recipes match these filters"
                  : "No recipes available yet"}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                marginTop: 4,
                textAlign: "center",
                paddingHorizontal: 24,
              }}
            >
              {loadError ||
                (hasFilters
                  ? "Try another cuisine or goal, or clear the filters to see everything."
                  : "Pull down to refresh.")}
            </Text>
            {hasFilters && (
              <TouchableOpacity
                onPress={clearFilters}
                style={[styles.clearButton, { borderColor: colors.primary }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
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
                    numberOfLines={1}
                  >
                    {[item.cuisine, item.category || "High-Protein"]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  <Text
                    style={{ color: colors.primary, fontWeight: "bold", flexShrink: 0 }}
                  >
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

                {/* Direct"Add To Diary" Button triggers Modal */}
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
                Select Meal Type
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
  searchInput: {
    minHeight: 44,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 14,
  },
  filterPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  filterGroupGap: { marginTop: 8 },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  chipRow: { paddingHorizontal: 12, gap: 8 },
  categoryPill: {
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
  },
  pillText: { fontWeight: "700", fontSize: 12 },
  filterSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  summaryText: { fontSize: 12, flexShrink: 1 },
  clearText: { fontSize: 12, fontWeight: "700" },
  clearButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
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
    gap: 8,
  },
  categoryBadge: {
    flexShrink: 1,
    overflow: "hidden",
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
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addToDiaryText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  emptyState: { alignItems: "center", marginTop: 40 },
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
    shadowColor: "#42F5A1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
});
