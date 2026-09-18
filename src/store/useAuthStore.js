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
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const storedTheme = await AsyncStorage.getItem("app_theme");

      set({
        token: storedToken || null,
        user: storedUser ? JSON.parse(storedUser) : null,
        theme: storedTheme || "dark",
        error: null,
      });
    } catch (error) {
      console.error("Storage load error:", error);
    }
  },

  setUser: (userData) => set({ user: userData }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const userData = res.data;

      await AsyncStorage.setItem("token", userData.token || "");
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      set({
        user: userData,
        token: userData.token || null,
        isLoading: false,
      });

      return { success: true, user: userData };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Login failed. Email ya password galat hai.";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/register`, {
        name,
        email,
        password,
      });
      const userData = res.data;

      await AsyncStorage.setItem("token", userData.token || "");
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      set({
        user: userData,
        token: userData.token || null,
        isLoading: false,
      });

      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || "Signup failed.";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const token = get().token || (await AsyncStorage.getItem("token"));

      const res = await axios.put(`${API_URL}/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedUser = {
        ...get().user,
        ...res.data,
        ...profileData,
        isOnboarded: true,
      };

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });

      return { success: true, user: updatedUser };
    } catch (err) {
      // Fallback local update if offline or API doesn't support field
      const fallbackUser = { ...get().user, ...profileData, isOnboarded: true };
      await AsyncStorage.setItem("user", JSON.stringify(fallbackUser)).catch(
        () => {},
      );
      set({ user: fallbackUser, isLoading: false });

      return { success: true, user: fallbackUser };
    }
  },

  updateUserGlobally: async (updatedData) => {
    const currentUser = get().user || {};
    const newUser = { ...currentUser, ...updatedData };
    await AsyncStorage.setItem("user", JSON.stringify(newUser)).catch(() => {});
    set({ user: newUser });
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
