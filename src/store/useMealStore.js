import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuthStore } from "./useAuthStore";

// Live Vercel Production Base URL & Endpoint Configurations
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app";
const API_URL = `${BASE_URL}/api/meals`;
const WATER_API_URL = `${BASE_URL}/api/water`;

// Local Timezone YYYY-MM-DD Date Helper (Avoids UTC Timezone mismatch)
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to fetch JWT authorization token
const getToken = async () => {
  const authStateToken = useAuthStore.getState().token;
  if (authStateToken) return authStateToken;
  return await AsyncStorage.getItem("token");
};

export const useMealStore = create((set, get) => ({
  todaySummary: { calories: 0, protein: 0, carbs: 0, fats: 0 },
  todayMeals: [],
  meals: [], // Alias for Dashboard Screen compatibility
  totalCalories: 0, // Direct state for Dashboard Screen
  weeklyHistory: [],
  waterIntake: 0,
  selectedDate: getTodayDateString(),
  isLoading: false,

  setSelectedDate: (date) =>
    set({ selectedDate: date || getTodayDateString() }),

  // 1. Fetch Daily Summary & Meals
  fetchDailySummary: async (dateParam) => {
    try {
      set({ isLoading: true });
      const token = await getToken();
      // Always fallback to current local date if not explicitly provided
      const targetDate =
        dateParam || get().selectedDate || getTodayDateString();

      const res = await axios.get(`${API_URL}/summary?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
          meals: mealsList, // Update alias
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
      set({ isLoading: false });
    }
  },

  // Alias Method for DashboardScreen
  fetchTodayMeals: async (dateParam) => {
    return await get().fetchDailySummary(dateParam);
  },

  // 2. Fetch Weekly Summary
  fetchWeeklySummary: async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/weekly-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        set({ weeklyHistory: res.data.data });
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
    try {
      const token = await getToken();
      const targetDate =
        dateParam || get().selectedDate || getTodayDateString();

      const res = await axios.get(`${WATER_API_URL}?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        set({ waterIntake: res.data.data?.glasses || 0 });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        set({ waterIntake: 0 });
      } else {
        console.error("Water fetch error:", error.message);
      }
    }
  },

  updateWaterIntake: async (glasses, dateParam) => {
    try {
      const token = await getToken();
      const targetDate =
        dateParam || get().selectedDate || getTodayDateString();

      const res = await axios.post(
        WATER_API_URL,
        { date: targetDate, glasses },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.success) {
        set({ waterIntake: res.data.data?.glasses ?? glasses });
        return { success: true };
      }
    } catch (error) {
      console.error("Water update error:", error.message);
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to update water",
      };
    }
  },

  // 4. Log Meal
  logMeal: async (mealData) => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      const targetDate = get().selectedDate || getTodayDateString();

      const payload = {
        ...mealData,
        date: mealData.date || targetDate,
      };

      const res = await axios.post(`${API_URL}/log`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        await get().fetchDailySummary(payload.date);
        set({ isLoading: false });
        return { success: true };
      }
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        message: err.response?.data?.message || "Error logging meal",
      };
    }
  },

  // 5. Update Meal
  updateMeal: async (mealId, updatedValues) => {
    try {
      const token = await getToken();
      const res = await axios.put(`${API_URL}/${mealId}`, updatedValues, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

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

  // 6. Delete Meal
  deleteMeal: async (mealId) => {
    try {
      const token = await getToken();
      const res = await axios.delete(`${API_URL}/${mealId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        await get().fetchDailySummary();
        return { success: true };
      } else {
        return {
          success: false,
          message: res.data?.message || "Delete failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Server request failed",
      };
    }
  },

  // 7. AI Scan Image Meal
  scanMealImage: async (imageBase64) => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/scan-ai`,
        { imageBase64, model: "gemini-3.5-flash-lite" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      set({ isLoading: false });
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      set({ isLoading: false });
      const statusCode = err.response?.status;
      return {
        success: false,
        status: statusCode,
        isProRequired: statusCode === 403,
        message: err.response?.data?.message || "AI scanning failed",
      };
    }
  },

  // 8. AI Analyze Text Meal
  analyzeTextMeal: async (text) => {
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/parse-text`,
        { text, model: "gemini-3.5-flash-lite" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
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
