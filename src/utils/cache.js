import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "NutriMorph_Cache_";

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
