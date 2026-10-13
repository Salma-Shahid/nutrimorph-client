import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "NutriMorph_Cache_";

// Data ko local storage mein save karne ke liye
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

// Local storage se cached data read karne ke liye
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
