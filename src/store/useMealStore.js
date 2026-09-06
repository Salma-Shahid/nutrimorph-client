import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuthStore } from "./useAuthStore";

// Base URL & Endpoint Configurations
const BASE_URL = "http://192.168.18.113:5000";
const API_URL = `${BASE_URL}/api/meals`;
const WATER_API_URL = `${BASE_URL}/api/water`;

// Token Helper
const getToken = async () => {
  const authStateToken = useAuthStore.getState().token;
  if (authStateToken) return authStateToken;
  return await AsyncStorage.getItem("token");
};

export const useMealStore = create((set, get) => ({
  todaySummary: { calories: 0, protein: 0, carbs: 0, fats: 0 },
  todayMeals: [],
  weeklyHistory: [],
  waterIntake: 0,
  selectedDate: new Date().toISOString().split("T")[0],
  isLoading: false,

  setSelectedDate: (date) => set({ selectedDate: date }),

  // 1. Fetch Daily Summary
  fetchDailySummary: async (dateParam) => {
    try {
      set({ isLoading: true });
      const token = await getToken();
      const dateToFetch = dateParam || get().selectedDate;

      const res = await axios.get(`${API_URL}/summary?date=${dateToFetch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        const data = res.data.data;
        set({
          todaySummary: data.summary || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
          },
          todayMeals: data.meals || [],
          isLoading: false,
        });
      }
    } catch (error) {
      console.error(
        "Error fetching daily summary:",
        error?.response?.data || error.message,
      );
      set({ isLoading: false });
    }
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
      const dateToFetch = dateParam || get().selectedDate;

      const res = await axios.get(`${WATER_API_URL}?date=${dateToFetch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        set({ waterIntake: res.data.data?.glasses || 0 });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        set({ waterIntake: 0 });
      } else {
        console.log("Water fetch error:", error.message);
      }
    }
  },

  updateWaterIntake: async (glasses) => {
    try {
      const token = await getToken();
      const date = get().selectedDate;

      const res = await axios.post(
        WATER_API_URL,
        { date, glasses },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data?.success) {
        set({ waterIntake: res.data.data?.glasses || glasses });
        return { success: true };
      }
    } catch (error) {
      console.error("Water update error:", error.message);
      return { success: false };
    }
  },

  // 4. Log Meal
  logMeal: async (mealData) => {
    set({ isLoading: true });
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/log`, mealData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        await get().fetchDailySummary();
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
        set((state) => ({
          todayMeals: state.todayMeals.map((meal) =>
            (meal._id || meal.id) === mealId ? res.data.data : meal,
          ),
        }));
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
        set((state) => ({
          todayMeals: state.todayMeals.filter(
            (item) => (item._id || item.id) !== mealId,
          ),
        }));
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
        { imageBase64 },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      set({ isLoading: false });
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        message: err.response?.data?.message || "AI scanning failed",
      };
    }
  },

  // 8. AI Analyze Text Meal (Fixed Endpoint & Token Helper)
  analyzeTextMeal: async (text) => {
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/parse-text`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, message: res.data?.message || "Parsing failed" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "AI Analysis failed",
      };
    }
  },
}));
