import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { stopBackgroundStepTracking } from "../services/stepTrackingTask";
import { clearUserScopedStorage } from "../utils/cache";
export { getThemeColors } from "../theme/colors";

// Profile refresh bookkeeping (module scope: one in-flight request at a time,
// and network failures are logged once instead of on every screen focus).
let profileRefreshPromise = null;
let lastProfileRefreshAt = 0;
let loggedOfflineRefresh = false;
const PROFILE_REFRESH_MIN_INTERVAL_MS = 15000;

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";
const API_URL = `${BASE_URL}/api/auth`;

const getLocalDate = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const getUserId = (user) => String(user?._id || user?.id || "");
const getDailyStepsKey = (userId, date) =>
  `dailySteps:${encodeURIComponent(userId)}:${date}`;

const normalizeBadgeId = (badge) => {
  const badgeId =
    typeof badge === "string" ? badge : badge?.badgeId || badge?.id;
  return String(badgeId || "").replace(/^steps_/, "step_");
};

const mergeUnlockedBadges = (...badgeLists) => {
  const badgesById = new Map();

  badgeLists.forEach((badges) => {
    if (!Array.isArray(badges)) return;

    badges.forEach((badge) => {
      const badgeId = normalizeBadgeId(badge);
      if (!badgeId || badgesById.has(badgeId)) return;

      badgesById.set(
        badgeId,
        typeof badge === "string" ? { badgeId } : { ...badge, badgeId },
      );
    });
  });

  return Array.from(badgesById.values());
};

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  theme: "dark",
  isRefreshingProfile: false,

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

  //  Helper to directly set or patch user object in store and storage
  setUser: async (userData) => {
    if (!userData) {
      await AsyncStorage.removeItem("user");
      set({ user: null });
      return;
    }
    const currentUser = get().user || {};
    const sameUser =
      !getUserId(currentUser) ||
      !getUserId(userData) ||
      getUserId(currentUser) === getUserId(userData);
    const mergedUser = { ...(sameUser ? currentUser : {}), ...userData };
    if (Array.isArray(userData.unlockedBadges)) {
      mergedUser.unlockedBadges = mergeUnlockedBadges(
        sameUser ? currentUser.unlockedBadges : [],
        userData.unlockedBadges,
      );
    }
    set({ user: mergedUser });
    await AsyncStorage.setItem("user", JSON.stringify(mergedUser));
  },

  // Refreshes the signed-in profile from /api/auth/me.
  // - Concurrent callers share one request; calls within 15 s reuse the last
  //   result unless `{ force: true }`.
  // - Network/CORS/offline failures keep the cached profile untouched and are
  //   reported as `{ offline: true }` without global error state or log spam.
  // - Only a rejected session (401 / deactivated) signs the user out.
  refreshUserProfile: async ({ force = false } = {}) => {
    const { token, user: currentUser } = get();
    if (!token || !currentUser) {
      return { success: false, message: "No authenticated user to refresh." };
    }
    if (profileRefreshPromise) return profileRefreshPromise;
    if (
      !force &&
      Date.now() - lastProfileRefreshAt < PROFILE_REFRESH_MIN_INTERVAL_MS
    ) {
      return { success: true, user: currentUser, cached: true };
    }

    const requestedUserId = getUserId(currentUser);
    set({ isRefreshingProfile: true });

    profileRefreshPromise = (async () => {
      try {
        // Cache-busting query param instead of a custom Cache-Control header,
        // so older backends without that header in their CORS allow-list still
        // accept the browser/Expo Web preflight.
        const response = await axios.get(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { _: Date.now() },
          timeout: 15000,
        });
        const profile = response.data?.user || response.data;

        if (!profile || getUserId(profile) !== requestedUserId) {
          throw new Error("Profile response does not match the signed-in user.");
        }

        const latestUser = get().user;
        if (
          getUserId(latestUser) !== requestedUserId ||
          get().token !== token
        ) {
          return { success: false, message: "The active account has changed." };
        }

        const updatedUser = {
          ...latestUser,
          ...profile,
          unlockedBadges: mergeUnlockedBadges(
            latestUser.unlockedBadges,
            profile.unlockedBadges,
          ),
        };

        lastProfileRefreshAt = Date.now();
        loggedOfflineRefresh = false;
        set({ user: updatedUser, error: null });
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      } catch (error) {
        const status = error?.response?.status;
        const code = error?.response?.data?.code;

        if (status === 401 || code === "ACCOUNT_DEACTIVATED") {
          // Session is no longer valid; clear it (only if still current).
          if (getUserId(get().user) === requestedUserId) await get().logout();
          return {
            success: false,
            sessionExpired: true,
            message: "Your session has expired. Please sign in again.",
          };
        }

        if (!error?.response) {
          // No response: offline, DNS, timeout or a CORS-blocked request.
          if (!loggedOfflineRefresh) {
            console.warn("Profile refresh skipped (network unavailable):", error?.message);
            loggedOfflineRefresh = true;
          }
          return {
            success: false,
            offline: true,
            user: get().user,
            message: "You're offline. Showing your last synced data.",
          };
        }

        const message =
          error?.response?.data?.message ||
          error.message ||
          "Could not refresh the account profile.";
        console.warn("Profile refresh failed:", status, message);
        return { success: false, user: get().user, message };
      } finally {
        profileRefreshPromise = null;
        set({ isRefreshingProfile: false });
      }
    })();

    return profileRefreshPromise;
  },

  // Onboarding Wizard Complete Handler
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

  //  Helper to update user gamification stats (Streak & Badges) in real-time
  updateUserStats: async (newStats) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...newStats };
    updatedUser.unlockedBadges = mergeUnlockedBadges(
      currentUser.unlockedBadges,
      newStats.unlockedBadges,
    );
    set({ user: updatedUser });
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
  },

  recordDailySteps: async (steps, date) => {
    const currentUser = get().user;
    if (!currentUser) return null;
    const userId = getUserId(currentUser);
    if (!userId) return null;

    const stepDate = date || getLocalDate();
    const incomingSteps = Number.isFinite(Number(steps))
      ? Math.max(0, Math.floor(Number(steps)))
      : 0;
    const storageKey = getDailyStepsKey(userId, stepDate);
    const storedStepsValue = await AsyncStorage.getItem(storageKey);
    if (getUserId(get().user) !== userId) return null;
    const latestUser = get().user;
    const storedSteps = Number(storedStepsValue);
    const existingSteps =
      storedStepsValue !== null && Number.isFinite(storedSteps)
        ? storedSteps
        : latestUser.stepUserId === userId &&
            latestUser.stepCountDate === stepDate
          ? Number(latestUser.dailySteps) || 0
          : 0;
    const dailySteps = Math.max(existingSteps, incomingSteps);
    const stepBadges = [
      { target: 5000, badgeId: "step_5k" },
      { target: 10000, badgeId: "step_10k" },
      { target: 15000, badgeId: "step_15k" },
      { target: 20000, badgeId: "step_20k" },
      { target: 25000, badgeId: "step_25k" },
      { target: 30000, badgeId: "step_30k" },
    ]
      .filter(({ target }) => dailySteps >= target)
      .map(({ badgeId }) => ({
        badgeId,
        unlockedAt: new Date().toISOString(),
      }));

    const updatedUser = {
      ...latestUser,
      dailySteps,
      stepCountDate: stepDate,
      stepUserId: userId,
      unlockedBadges: mergeUnlockedBadges(
        latestUser.unlockedBadges,
        stepBadges,
      ),
    };
    set({ user: updatedUser });
    await AsyncStorage.setItem(storageKey, String(dailySteps));
    if (getUserId(get().user) === userId) {
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    }
    return updatedUser;
  },

  setDailySteps: async (steps, date) => {
    const currentUser = get().user;
    const userId = getUserId(currentUser);
    if (!userId) return null;

    const stepDate = date || getLocalDate();
    const dailySteps = Math.max(0, Math.floor(Number(steps) || 0));
    const updatedUser = {
      ...currentUser,
      dailySteps,
      stepCountDate: stepDate,
      stepUserId: userId,
    };
    const storageKey = getDailyStepsKey(userId, stepDate);
    await AsyncStorage.setItem(storageKey, String(dailySteps));
    if (getUserId(get().user) !== userId) return null;
    set({ user: updatedUser });
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    return updatedUser;
  },

  // Signup / Register Function
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

  register: async (name, email, password) => {
    return await get().signup(name, email, password);
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const userData = res.data;

      // Signing into a different account than the one cached on this device:
      // drop the previous account's local data before switching.
      const previousRaw = await AsyncStorage.getItem("user").catch(() => null);
      const previousId = previousRaw ? getUserId(JSON.parse(previousRaw)) : "";
      if (previousId && previousId !== getUserId(userData)) {
        await clearUserScopedStorage(previousId);
      }
      lastProfileRefreshAt = Date.now();

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
        error: null,
      });

      return { success: true, user: formattedUser };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed.";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  logout: async () => {
    const currentUserId = getUserId(get().user);
    set({
      user: null,
      token: null,
      error: null,
      isLoading: false,
      isRefreshingProfile: false,
    });
    lastProfileRefreshAt = 0;
    try {
      const storageKeys = ["token", "user", "hasCompletedOnboarding"];
      await stopBackgroundStepTracking().catch((error) => {
        console.error("Could not stop background step tracking on logout:", error);
      });
      await Promise.all(storageKeys.map((key) => AsyncStorage.removeItem(key)));
      // Every cache/steps/sensor key owned by this account (all dates).
      await clearUserScopedStorage(currentUserId);
    } catch (e) {
      console.error("Logout error:", e);
    }
  },

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
        // Same cleanup as logout: token, profile, caches, step tracking.
        await get().logout();
        set({ isLoading: false });
        const notes = Array.isArray(res.data.notes) ? res.data.notes : [];
        return {
          success: true,
          message: [res.data.message, ...notes].filter(Boolean).join("\n\n"),
        };
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
