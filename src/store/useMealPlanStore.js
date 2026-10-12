import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "./useAuthStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Live Vercel Production Base URL & Endpoint Configuration
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app";
const API_URL = `${BASE_URL}/api/meal-plans`;

// Helper to get token from auth store or async storage
const getToken = async () => {
  const authStateToken = useAuthStore.getState().token;
  if (authStateToken) return authStateToken;
  return await AsyncStorage.getItem("token");
};

export const useMealPlanStore = create((set) => ({
  activeMealPlan: null,
  isLoading: false,
  error: null,

  // 1. Generate Custom Duration Meal Plan via Gemini AI
  generateMealPlan: async (planData) => {
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/generate`, planData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        set({ activeMealPlan: res.data.data, isLoading: false });
        return { success: true };
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error.message;
      set({ error: errorMsg, isLoading: false });
      return { success: false, message: errorMsg };
    }
  },

  // 2. Fetch Active Meal Plan
  fetchActiveMealPlan: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        set({ activeMealPlan: res.data.data, isLoading: false });
      }
    } catch (error) {
      // If 404, it just means no active plan exists yet, which is normal
      set({ activeMealPlan: null, isLoading: false });
    }
  },
}));
