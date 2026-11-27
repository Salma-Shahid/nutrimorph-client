import axios from "axios";

// Gems & streak revive API. The server is the source of truth for balances,
// Pro tier grants, and revive state; the app only displays what it returns.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api.nutrimorph.app";

export const getLocalDate = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const headers = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
  timeout: 15000,
});

// Normalises success and error responses to { success, data, message, code }.
const call = async (request) => {
  try {
    const res = await request();
    return { success: true, ...res.data };
  } catch (error) {
    const body = error?.response?.data || {};
    return {
      success: false,
      data: body.data || null,
      code: body.code || null,
      message:
        body.message ||
        (error?.response ? "Something went wrong. Please try again." : "You're offline. Try again when connected."),
    };
  }
};

export const fetchGemStatus = (token) =>
  call(() => axios.get(`${API_BASE_URL}/api/gems?date=${getLocalDate()}`, headers(token)));

export const claimAdGems = (token) =>
  call(() =>
    axios.post(`${API_BASE_URL}/api/gems/ad-reward`, { date: getLocalDate() }, headers(token)),
  );

export const reviveStreak = (token) =>
  call(() =>
    axios.post(`${API_BASE_URL}/api/gems/revive`, { date: getLocalDate() }, headers(token)),
  );

// Visual style per Pro tier.
export const TIER_STYLES = {
  emerald: { color: "#10B981", icon: "diamond" },
  gold: { color: "#F59E0B", icon: "diamond" },
  sapphire: { color: "#3B82F6", icon: "diamond" },
  ruby: { color: "#E11D48", icon: "diamond" },
};
