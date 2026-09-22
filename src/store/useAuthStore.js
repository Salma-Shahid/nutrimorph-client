import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://nutrimorph-backend.vercel.app";
const API_URL = `${BASE_URL}/api/auth`;

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  theme: "dark",

  loadStorage: async () => {
    try {
      set({ isLoading: true });
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const storedTheme = await AsyncStorage.getItem("app_theme");

      let parsedUser = storedUser ? JSON.parse(storedUser) : null;
      if (parsedUser) {
        const cachedAvatar = await AsyncStorage.getItem(
          `avatar_${parsedUser._id || parsedUser.email}`,
        );
        if (cachedAvatar) {
          parsedUser.avatar = cachedAvatar;
        }
      }

      set({
        token: storedToken || null,
        user: parsedUser,
        theme: storedTheme || "dark",
        error: null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Storage load error:", error);
      set({ isLoading: false });
    }
  },

  toggleTheme: async () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    await AsyncStorage.setItem("app_theme", nextTheme).catch(() => {});
    set({ theme: nextTheme });
  },

  // Real-time DB Sync & Plan Update
  toggleSubscriptionTier: async (tier) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const newTier =
      tier || (currentUser.subscriptionTier === "pro" ? "free" : "pro");
    const updatedUser = {
      ...currentUser,
      subscriptionTier: newTier,
      isPro: newTier === "pro",
      plan: newTier,
    };

    // 1. Local state aur storage update
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    set({ user: updatedUser });

    // 2. Direct API call to update Backend / MongoDB Atlas
    try {
      const token = get().token;
      if (token) {
        await axios.put(
          `${API_URL}/profile`,
          {
            subscriptionTier: newTier,
            isPro: newTier === "pro",
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    } catch (e) {
      console.error("Plan DB sync failed:", e.response?.data || e.message);
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = get().user || {};
      const updatedUser = { ...currentUser, ...profileData };

      if (profileData.avatar) {
        await AsyncStorage.setItem(
          `avatar_${currentUser._id || currentUser.email}`,
          profileData.avatar,
        );
      }

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });

      const token = get().token;
      if (token) {
        await axios.put(`${API_URL}/profile`, profileData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Profile update failed";
      set({ isLoading: false, error: errorMsg });
      return { success: false, message: errorMsg };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const userData = res.data;

      const cachedAvatar = await AsyncStorage.getItem(
        `avatar_${userData._id || userData.email}`,
      );
      const formattedUser = {
        ...userData,
        avatar:
          cachedAvatar || userData.avatar || userData.profileImage || null,
      };

      await AsyncStorage.setItem("token", userData.token || "");
      await AsyncStorage.setItem("user", JSON.stringify(formattedUser));

      set({
        user: formattedUser,
        token: userData.token || null,
        isLoading: false,
      });

      return { success: true, user: formattedUser };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed.";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (e) {
      console.error("Logout error:", e);
    }
    set({ user: null, token: null, error: null });
  },
}));
