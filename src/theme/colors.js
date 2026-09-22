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
