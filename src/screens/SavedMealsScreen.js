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
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useMealStore } from "../store/useMealStore";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app"}/api`;

export default function SavedMealsScreen({ navigation }) {
  const { token: storeToken } = useAuthStore();
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

  // Screen open hotay hi har baar latest saved recipes fetch hon gi
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
      Alert.alert("Success", `${meal.name} added to today's log!`);
    } else {
      Alert.alert("Error", result.message || "Failed to log meal");
    }
  };

  const handleDelete = async (item) => {
    const mealId = item._id || item.id;
    Alert.alert(
      "Delete Recipe",
      "Are you sure you want to delete this saved recipe?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getAuthToken();
              const res = await axios.delete(
                `${API_BASE}/saved-meals/${mealId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

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
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.mealName}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={{ padding: 4 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.macrosRow}>
        <Text style={styles.macroText}>🔥 {item.calories} kcal</Text>
        <Text style={styles.macroText}>🥩 P: {item.protein}g</Text>
        <Text style={styles.macroText}>🍞 C: {item.carbs}g</Text>
        <Text style={styles.macroText}>🥑 F: {item.fats}g</Text>
      </View>

      <TouchableOpacity
        style={styles.logButton}
        onPress={() => handleLogSavedMeal(item)}
      >
        <Text style={styles.logButtonText}>+ Log to Today</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Recipes & Meals</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && savedMeals.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          data={savedMeals}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No saved recipes yet.</Text>
              <Text style={styles.emptySubText}>
                Save your favorite meals while logging to access them quickly
                here!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "bold",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mealName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 8,
  },
  macroText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  logButton: {
    backgroundColor: "#0284C7",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  logButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
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
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
  },
  emptySubText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
});
