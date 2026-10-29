import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useMealStore } from "../store/useMealStore";
import { useAuthStore } from "../store/useAuthStore";
import { getThemeColors } from "../theme/colors";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app"}/api`;

export default function SavedMealsScreen({ navigation }) {
  const { token: storeToken, theme } = useAuthStore();
  const colors = getThemeColors(theme);
  const { logMeal } = useMealStore();

  const [savedMeals, setSavedMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthToken = async () => {
    let activeToken = storeToken;
    if (!activeToken) {
      activeToken = await AsyncStorage.getItem("token");
    }
    return activeToken;
  };

  const fetchSavedMealsDirect = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const res = await axios.get(`${API_BASE}/saved-meals`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setSavedMeals(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching saved meals directly:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSavedMealsDirect();
    }, []),
  );

  const handleLogSavedMeal = async (meal) => {
    const result = await logMeal({
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
    });

    if (result.success) {
      Alert.alert("Success 🎯", `${meal.name} added to today's log!`);
    } else {
      Alert.alert("Error", result.message || "Failed to log meal");
    }
  };

  const handleDelete = async (item) => {
    const mealId = item._id || item.id;

    const confirmDelete = async () => {
      try {
        const token = await getAuthToken();
        const res = await axios.delete(`${API_BASE}/saved-meals/${mealId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success) {
          setSavedMeals((prev) =>
            prev.filter((m) => (m._id || m.id) !== mealId),
          );
          Alert.alert("Success", "Saved recipe deleted successfully!");
        } else {
          Alert.alert("Error", "Failed to delete saved recipe");
        }
      } catch (error) {
        Alert.alert(
          "Error",
          error.response?.data?.message ||
            error.message ||
            "Failed to delete saved recipe",
        );
      }
    };

    if (typeof window !== "undefined" && window.confirm) {
      if (
        window.confirm("Are you sure you want to delete this saved recipe?")
      ) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Recipe",
        "Are you sure you want to delete this saved recipe?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: confirmDelete,
          },
        ],
      );
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.mealName, { color: colors.text }]}>
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={{ padding: 4 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.macrosRow,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.macroText, { color: colors.text }]}>
          🔥 {item.calories} kcal
        </Text>
        <Text style={[styles.macroText, { color: colors.text }]}>
          🥩 P: {item.protein}g
        </Text>
        <Text style={[styles.macroText, { color: colors.text }]}>
          🍞 C: {item.carbs}g
        </Text>
        <Text style={[styles.macroText, { color: colors.text }]}>
          🥑 F: {item.fats}g
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.logButton, { backgroundColor: colors.primary }]}
        onPress={() => handleLogSavedMeal(item)}
      >
        <Text style={styles.logButtonText}>+ Log to Today</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Saved Recipes & Meals 🥗
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && savedMeals.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={savedMeals}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="restaurant-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No saved recipes yet.
              </Text>
              <Text
                style={[styles.emptySubText, { color: colors.textSecondary }]}
              >
                Save your favorite meals while logging to access them quickly
                here!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
  },
  macroText: {
    fontSize: 12,
    fontWeight: "600",
  },
  logButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
});
