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

    // 1. Local state and storage update
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

  // 🟢 Onboarding Wizard Complete Handler (Hits /api/auth/onboarding)
  completeOnboarding: async (onboardingData) => {
    set({ isLoading: true, error: null });
    try {
      const token = get().token || (await AsyncStorage.getItem("token"));

      if (!token) {
        set({ isLoading: false });
        return { success: false, message: "Authentication token missing." };
      }

      const res = await axios.post(`${API_URL}/onboarding`, onboardingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && res.data?.user) {
        const updatedUser = res.data.user;
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

        set({
          user: updatedUser,
          isLoading: false,
          error: null,
        });

        return { success: true, user: updatedUser };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: res.data?.message || "Onboarding submission failed.",
      };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to complete onboarding.";
      set({ isLoading: false, error: errorMsg });
      return { success: false, message: errorMsg };
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

      const token = get().token;

      // 🟢 If Onboarding data is passed via updateProfile, route to /onboarding endpoint
      if (profileData.isOnboardingCompleted) {
        if (token) {
          const res = await axios.post(`${API_URL}/onboarding`, profileData, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data?.success && res.data?.user) {
            const backendUser = res.data.user;
            await AsyncStorage.setItem("user", JSON.stringify(backendUser));
            set({ user: backendUser, isLoading: false });
            return { success: true, user: backendUser };
          }
        }
      }

      // Standard profile update route fallback
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });

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

  // 🟢 Helper to update user gamification stats (Streak & Badges) in real-time
  updateUserStats: async (newStats) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...newStats };
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  // 🟢 Signup / Register Function
  signup: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const payload =
        typeof name === "object" ? name : { name, email, password };

      const res = await axios.post(`${API_URL}/register`, payload);
      const userData = res.data;

      if (userData.token) {
        await AsyncStorage.setItem("token", userData.token || "");
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        set({
          user: userData,
          token: userData.token || null,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }

      return { success: true, ...userData };
    } catch (err) {
      const message = err.response?.data?.message || "Signup failed.";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  // Alias for signup if component uses register
  register: async (name, email, password) => {
    return await get().signup(name, email, password);
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

  // 🔴 Permanent Account Deletion Action (Google Play Compliance P0)
  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = get().token || (await AsyncStorage.getItem("token"));

      if (!token) {
        set({ isLoading: false });
        return { success: false, message: "Authentication token missing." };
      }

      const res = await axios.delete(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        const currentUser = get().user;
        if (currentUser) {
          await AsyncStorage.removeItem(
            `avatar_${currentUser._id || currentUser.email}`,
          ).catch(() => {});
        }
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");

        set({ user: null, token: null, isLoading: false, error: null });
        return { success: true, message: res.data.message };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: res.data?.message || "Account deletion failed.",
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to delete account. Try again.";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },
}));

// Theme colors helper exported for screens
export const getThemeColors = (theme) => {
  const isDark = theme === "dark";

  return {
    bg: isDark ? "#0F172A" : "#F8FAFC",
    cardBg: isDark ? "#1E293B" : "#FFFFFF",
    inputBg: isDark ? "#334155" : "#F1F5F9",
    text: isDark ? "#FFFFFF" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    primary: "#10B981",
  };
};
