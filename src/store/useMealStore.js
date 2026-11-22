import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuthStore } from "./useAuthStore";

// Live Vercel Production Base URL & Endpoint Configurations
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const API_URL = `${BASE_URL}/api/meals`;
const WATER_API_URL = `${BASE_URL}/api/water`;
const SAVED_MEALS_API_URL = `${BASE_URL}/api/saved-meals`;

// Local Timezone YYYY-MM-DD Date Helper (Avoids UTC Timezone mismatch)
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getAuthContext = async () => {
  const authState = useAuthStore.getState();
  const userId = String(authState.user?._id || authState.user?.id || "");
  if (!userId) return null;
  const token = authState.token || (await AsyncStorage.getItem("token"));
  const latestState = useAuthStore.getState();
  if (
    String(latestState.user?._id || latestState.user?.id || "") !== userId ||
    (latestState.token && latestState.token !== token)
  ) {
    return null;
  }
  return { userId, token };
};

const isAuthContextCurrent = ({ userId, token }) => {
  const authState = useAuthStore.getState();
  return (
    String(authState.user?._id || authState.user?.id || "") === userId &&
    (!authState.token || authState.token === token)
  );
};

export const useMealStore = create((set, get) => ({
  todaySummary: { calories: 0, protein: 0, carbs: 0, fats: 0 },
  todayMeals: [],
  meals: [], // Alias for Dashboard Screen compatibility
  totalCalories: 0, // Direct state for Dashboard Screen
  weeklyHistory: [],
  weeklyAiInsight: "",
  waterIntake: 0,
  savedMeals: [], // Saved meals / recipes list
  selectedDate: getTodayDateString(),
  isLoading: false,

  setSelectedDate: (date) =>
    set({ selectedDate: date || getTodayDateString() }),

  // 1. Fetch Daily Summary & Meals
  fetchDailySummary: async (dateParam) => {
    let authContext;
    try {
      set({ isLoading: true });
      authContext = await getAuthContext();
      if (!authContext?.token) {
        set({
          todaySummary: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          totalCalories: 0,
          todayMeals: [],
          meals: [],
          isLoading: false,
        });
        return;
      }
      // Always fallback to current local date if not explicitly provided
      const targetDate =
        dateParam || get().selectedDate || getTodayDateString();

      const res = await axios.get(
        `${API_URL}/summary?date=${encodeURIComponent(targetDate)}`,
        {
          headers: { Authorization: `Bearer ${authContext.token}` },
        },
      );

      if (!isAuthContextCurrent(authContext)) return;

      if (res.data?.success) {
        const data = res.data.data;
        const summary = data.summary || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        };
        const mealsList = data.meals || [];

        set({
          todaySummary: summary,
          totalCalories: summary.calories || 0,
          todayMeals: mealsList,
          meals: mealsList,
          selectedDate: targetDate,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error(
        "Error fetching daily summary:",
        error?.response?.data || error.message,
      );
      if (!authContext || isAuthContextCurrent(authContext)) {
        set({ isLoading: false });
      }
    }
  },

  // Alias Method for DashboardScreen
  fetchTodayMeals: async (dateParam) => {
    return await get().fetchDailySummary(dateParam);
  },

  // 2. Fetch Weekly Summary
  fetchWeeklySummary: async () => {
    let authContext;
    try {
      authContext = await getAuthContext();
      if (!authContext?.token) return;
      const res = await axios.get(`${API_URL}/weekly-summary`, {
        headers: { Authorization: `Bearer ${authContext.token}` },
      });

      if (!isAuthContextCurrent(authContext)) return;
      if (res.data?.success) {
        const responseData = res.data.data;
        set({
          weeklyHistory: responseData.weeklyHistory || [],
          weeklyAiInsight: responseData.aiInsight || "",
        });
      }
    } catch (error) {
      console.error(
        "Error fetching weekly summary:",
        error?.response?.data || error.message,
      );
    }
  },

  // 3. Water Intake Methods
  fetchWaterIntake: async (dateParam) => {
    let authContext;
    try {
      authContext = await getAuthContext();
      if (!authContext?.token) {
        set({ waterIntake: 0 });
        return;
      }
      const targetDate =
        dateParam || get().selectedDate || getTodayDateString();

      const res = await axios.get(
        `${WATER_API_URL}?date=${encodeURIComponent(targetDate)}`,
        {
          headers: { Authorization: `Bearer ${authContext.token}` },
        },
      );

      if (!isAuthContextCurrent(authContext)) return;
      if (res.data?.success) {
        set({ waterIntake: res.data.data?.glasses || 0 });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        if (!authContext || isAuthContextCurrent(authContext)) {
          set({ waterIntake: 0 });
        }
      } else {
        console.error("Water fetch error:", error.message);
      }
    }
  },

  updateWaterIntake: async (glasses, date) => {
    try {
      const authContext = await getAuthContext();
      if (!authContext?.token) {
        return { success: false, message: "Sign in to sync water intake." };
      }
      const response = await axios.post(
        `${WATER_API_URL}`,
        { glasses, date },
        { headers: { Authorization: `Bearer ${authContext.token}` } },
      );

      if (!isAuthContextCurrent(authContext)) {
        return { success: false, message: "The active account has changed." };
      }
      if (response.data.success) {
        set({ waterIntake: glasses });

        // Update Auth Store User's Unlocked Badges in Real-Time
        if (response.data.unlockedBadges) {
          useAuthStore.getState().updateUserStats({
            unlockedBadges: response.data.unlockedBadges,
          });
        }
      }
      return response.data;
    } catch (error) {
      console.error("Error updating water intake:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Could not update water intake.",
      };
    }
  },

  // 4. Saved Meals / Recipes Methods
  fetchSavedMeals: async () => {
    let authContext;
    try {
      authContext = await getAuthContext();
      if (!authContext?.token) {
        set({ savedMeals: [] });
        return;
      }
      const res = await axios.get(SAVED_MEALS_API_URL, {
        headers: { Authorization: `Bearer ${authContext.token}` },
      });

      if (isAuthContextCurrent(authContext) && res.data?.success) {
        set({ savedMeals: res.data.data || [] });
      }
    } catch (error) {
      console.error("Error fetching saved meals:", error.message);
    }
  },

  saveMealRecipe: async (mealData) => {
    try {
      const authContext = await getAuthContext();
      if (!authContext?.token) {
        return { success: false, message: "Sign in to save a recipe." };
      }
      const res = await axios.post(SAVED_MEALS_API_URL, mealData, {
        headers: { Authorization: `Bearer ${authContext.token}` },
      });

      if (!isAuthContextCurrent(authContext)) {
        return { success: false, message: "The active account has changed." };
      }
      if (res.data?.success) {
        await get().fetchSavedMeals();
        return { success: true, message: "Meal recipe saved successfully!" };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to save meal recipe",
      };
    }
  },

  deleteSavedMeal: async (recipeId) => {
    try {
      const authContext = await getAuthContext();
      if (!authContext?.token) {
        return { success: false, message: "Sign in to delete a recipe." };
      }
      const res = await axios.delete(`${SAVED_MEALS_API_URL}/${recipeId}`, {
        headers: { Authorization: `Bearer ${authContext.token}` },
      });

      if (!isAuthContextCurrent(authContext)) {
        return { success: false, message: "The active account has changed." };
      }
      if (res.data?.success) {
        set((state) => ({
          savedMeals: state.savedMeals.filter((item) => item._id !== recipeId),
        }));
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to delete saved recipe",
      };
    }
  },

  // 5. Log Meal
  logMeal: async (mealData) => {
    set({ isLoading: true });
    let authContext;
    try {
      authContext = await getAuthContext();
      if (!authContext?.token) {
        set({ isLoading: false });
        return { success: false, message: "Sign in to log a meal." };
      }
      const targetDate = get().selectedDate || getTodayDateString();

      const payload = {
        ...mealData,
        date: mealData.date || targetDate,
      };

      const res = await axios.post(`${API_URL}/log`, payload, {
        headers: { Authorization: `Bearer ${authContext.token}` },
      });

      if (res.data?.success) {
        if (!isAuthContextCurrent(authContext)) {
          return {
            success: false,
            message: "The active account has changed.",
          };
        }
        await get().fetchDailySummary(payload.date);
        set({ isLoading: false });
        return { success: true, data: res.data.data };
      }
      set({ isLoading: false });
      return {
        success: false,
        message: res.data?.message || "Error logging meal",
      };
    } catch (err) {
      if (!authContext || isAuthContextCurrent(authContext)) {
        set({ isLoading: false });
      }
      return {
        success: false,
        message: err.response?.data?.message || "Error logging meal",
      };
    }
  },

  // 6. Update Meal
  updateMeal: async (mealId, updatedValues) => {
    try {
      const authContext = await getAuthContext();
      if (!authContext?.token) {
        return { success: false, message: "Sign in to update a meal." };
      }
      const res = await axios.put(`${API_URL}/${mealId}`, updatedValues, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authContext.token}`,
        },
      });

      if (!isAuthContextCurrent(authContext)) {
        return { success: false, message: "The active account has changed." };
      }
      if (res.data?.success) {
        await get().fetchDailySummary();
        return { success: true };
      } else {
        return {
          success: false,
          message: res.data?.message || "Update failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  },

  // 7. Delete Meal (With Instant Optimistic UI Update & Re-fetch Sync)
  deleteMeal: async (mealId) => {
    let authContext;
    try {
      authContext = await getAuthContext();
      if (!authContext?.token) {
        return { success: false, message: "Sign in to delete a meal." };
      }
      const targetDate = get().selectedDate || getTodayDateString();

      //  Step A: Optimistically remove from state for instant UI update
      const currentMeals = get().meals;
      const filteredMeals = currentMeals.filter(
        (m) => (m._id || m.id) !== mealId,
      );
      const newTotalCalories = filteredMeals.reduce(
        (sum, item) => sum + (Number(item.calories) || 0),
        0,
      );

      set({
        meals: filteredMeals,
        todayMeals: filteredMeals,
        totalCalories: newTotalCalories,
      });

      //  Step B: Call backend delete API
      const res = await axios.delete(`${API_URL}/${mealId}`, {
        headers: { Authorization: `Bearer ${authContext.token}` },
      });

      if (!isAuthContextCurrent(authContext)) {
        return { success: false, message: "The active account has changed." };
      }
      if (res.status === 200 || res.data?.success) {
        // Sync summary in background
        await get().fetchDailySummary(targetDate);
        return { success: true };
      } else {
        // Revert summary if failed
        await get().fetchDailySummary(targetDate);
        return {
          success: false,
          message: res.data?.message || "Delete failed",
        };
      }
    } catch (error) {
      console.error(
        "Delete meal error:",
        error?.response?.data || error.message,
      );
      // Revert back on error
      if (!authContext || isAuthContextCurrent(authContext)) {
        const targetDate = get().selectedDate || getTodayDateString();
        await get().fetchDailySummary(targetDate);
      }
      return {
        success: false,
        message: error.response?.data?.message || "Server request failed",
      };
    }
  },

  // 8. AI Scan Image Meal
  scanMealImage: async (imageBase64) => {
    set({ isLoading: true });
    let authContext;
    try {
      authContext = await getAuthContext();
      if (!authContext?.token) {
        set({ isLoading: false });
        return { success: false, message: "Sign in to scan a meal." };
      }
      const res = await axios.post(
        `${API_URL}/scan-ai`,
        { imageBase64 },
        { headers: { Authorization: `Bearer ${authContext.token}` } },
      );
      if (!isAuthContextCurrent(authContext)) {
        set({ isLoading: false });
        return { success: false, message: "The active account has changed." };
      }
      set({ isLoading: false });
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      if (!authContext || isAuthContextCurrent(authContext)) {
        set({ isLoading: false });
      }
      const statusCode = err.response?.status;
      return {
        success: false,
        status: statusCode,
        isProRequired: statusCode === 403,
        message: err.response?.data?.message || "AI scanning failed",
      };
    }
  },

  // 9. AI Analyze Text Meal
  analyzeTextMeal: async (text) => {
    try {
      const authContext = await getAuthContext();
      if (!authContext?.token) {
        return { success: false, message: "Sign in to analyze a meal." };
      }
      const res = await axios.post(
        `${API_URL}/parse-text`,
        { text },
        { headers: { Authorization: `Bearer ${authContext.token}` } },
      );
      if (!isAuthContextCurrent(authContext)) {
        return { success: false, message: "The active account has changed." };
      }
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
      return {
        success: false,
        message: res.data?.message || "Parsing failed",
      };
    } catch (err) {
      const statusCode = err.response?.status;
      return {
        success: false,
        status: statusCode,
        isProRequired: statusCode === 403,
        message: err.response?.data?.message || "AI analysis failed",
      };
    }
  },
}));

useAuthStore.subscribe((state, previousState) => {
  const activeUserId = String(state.user?._id || state.user?.id || "");
  const previousUserId = String(
    previousState.user?._id || previousState.user?.id || "",
  );
  if (activeUserId !== previousUserId) {
    useMealStore.setState({
      todaySummary: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      todayMeals: [],
      meals: [],
      totalCalories: 0,
      weeklyHistory: [],
      weeklyAiInsight: "",
      waterIntake: 0,
      savedMeals: [],
      selectedDate: getTodayDateString(),
      isLoading: false,
    });
  }
});
