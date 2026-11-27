import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "NutriMorph_Cache_";

// Cache keys must always embed the owning user's ID (see DashboardScreen /
// MealPlanScreen), e.g. `meals:<userId>:<date>`, so data never crosses
// accounts and can be wiped per user.
export const userCacheKey = (userId, ...parts) =>
  [parts[0], encodeURIComponent(String(userId || "signed-out")), ...parts.slice(1)]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(":");

// Save data to local storage.
export const saveDataToCache = async (key, data) => {
  try {
    const payload = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch (error) {
    console.error("Cache save error:", error);
  }
};

// Read cached data from local storage.
export const getDataFromCache = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed.data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
};

// Remove every locally stored item that belongs to one user: dashboard and
// meal-plan caches, daily step counters and pedometer sensor state.
export const clearUserScopedStorage = async (userId) => {
  if (!userId) return;
  const scope = encodeURIComponent(String(userId));
  try {
    const keys = await AsyncStorage.getAllKeys();
    const owned = keys.filter(
      (key) =>
        (key.startsWith(CACHE_PREFIX) && key.includes(`:${scope}`)) ||
        key.startsWith(`dailySteps:${scope}:`) ||
        key.startsWith(`stepSensorState:${scope}:`),
    );
    if (owned.length) await AsyncStorage.multiRemove(owned);
  } catch (error) {
    console.warn("Could not clear user-scoped storage:", error?.message);
  }
};
