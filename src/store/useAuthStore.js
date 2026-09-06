import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// ⚠️ Ensure karein ke backend IP aur port exact yahi ho
// const API_URL = "http://192.168.18.113:5000/api/auth";

// ✅ Naya Secure Localtunnel HTTPS URL
const API_URL = "https://cool-icons-smoke.loca.lt/api/auth";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  theme: "dark",

  // ✅ App start hone par storage se User, Token aur Theme load karne ke liye
  loadStorage: async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const storedTheme = await AsyncStorage.getItem("app_theme");

      set({
        token: storedToken || null,
        user: storedUser ? JSON.parse(storedUser) : null,
        theme: storedTheme || "dark",
      });
    } catch (error) {
      console.error("Storage load error:", error);
    }
  },

  setUser: (userData) => set({ user: userData }),

  // 🔒 Localtunnel Bypass Header ke sath Login function
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await axios.post(
        `${API_URL}/login`,
        { email, password },
        { headers: { "Bypass-Tunnel-Reminder": "true" } },
      );
      const userData = res.data;

      await AsyncStorage.setItem("token", userData.token || "");
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      set({ user: userData, token: userData.token, isLoading: false });
      return { success: true, user: userData };
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true });
    try {
      const token = get().token || (await AsyncStorage.getItem("token"));

      // Hit: http://192.168.18.113:5000/api/auth/profile
      const res = await axios.put(`${API_URL}/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedUser = { ...get().user, ...res.data, isOnboarded: true };

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });

      return { success: true, user: updatedUser };
    } catch (err) {
      set({ isLoading: false });
      console.error(
        "Profile update error details:",
        err.response?.data || err.message,
      );
      return {
        success: false,
        message: err.response?.data?.message || "Profile update failed",
      };
    }
  },

  updateUserGlobally: async (updatedData) => {
    const currentUser = get().user || {};
    const newUser = { ...currentUser, ...updatedData };
    await AsyncStorage.setItem("user", JSON.stringify(newUser)).catch(() => {});
    set({ user: newUser });
  },

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      AsyncStorage.setItem("app_theme", nextTheme).catch(() => {});
      return { theme: nextTheme };
    }),

  logout: async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    set({ user: null, token: null });
  },
}));
