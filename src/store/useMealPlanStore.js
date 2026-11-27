import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "./useAuthStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Live Vercel Production Base URL & Endpoint Configuration
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const API_URL = `${BASE_URL}/api/meal-plans`;

// Helper to get token from auth store or async storage
const getToken = async () => {
  const authStateToken = useAuthStore.getState().token;
  if (authStateToken) return authStateToken;
  return await AsyncStorage.getItem("token");
};

const activeUserId = () => {
  const user = useAuthStore.getState().user;
  return String(user?._id || user?.id || "");
};

export const useMealPlanStore = create((set) => ({
  activeMealPlan: null,
  isLoading: false,
  error: null,

  // 1. Generate Custom Duration Meal Plan via Gemini AI
  generateMealPlan: async (planData) => {
    const requestUserId = activeUserId();
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/generate`, planData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Ignore responses that arrive after an account switch.
      if (activeUserId() !== requestUserId) {
        return { success: false, message: "The active account has changed." };
      }
      if (res.data?.success) {
        set({ activeMealPlan: res.data.data, isLoading: false });
        return { success: true, data: res.data.data };
      }
      set({ isLoading: false });
      return {
        success: false,
        message: res.data?.message || "Meal plan generation failed.",
      };
    } catch (error) {
      if (activeUserId() !== requestUserId) {
        return { success: false, message: "The active account has changed." };
      }
      const errorMsg = error?.response?.data?.message || error.message;
      set({ error: errorMsg, isLoading: false });
      return {
        success: false,
        message: errorMsg,
        code: error?.response?.data?.code,
        status: error?.response?.status,
      };
    }
  },

  // 2. Fetch Active Meal Plan
  fetchActiveMealPlan: async () => {
    const requestUserId = activeUserId();
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeUserId() !== requestUserId) {
        return { success: false, stale: true };
      }

      if (res.data?.success) {
        set({ activeMealPlan: res.data.data, isLoading: false });
        return { success: true, data: res.data.data };
      }
      set({ activeMealPlan: null, isLoading: false });
      return { success: false, notFound: true };
    } catch (error) {
      if (activeUserId() !== requestUserId) {
        return { success: false, stale: true };
      }
      // Offline: keep the plan already on screen (it may come from cache).
      if (!error.response) {
        set({ isLoading: false, error: "You're offline. Showing your saved plan." });
        return { success: false, offline: true };
      }
      const notFound = error.response?.status === 404;
      const message =
        error.response?.data?.message ||
        error.message ||
        "Could not load the active meal plan.";
      set({ activeMealPlan: null, isLoading: false, error: message });
      return { success: false, notFound, message };
    }
  },
}));
