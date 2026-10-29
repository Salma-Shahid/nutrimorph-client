export const getThemeColors = (theme) => {
  const isDark = theme === "dark";

  return {
    bg: isDark ? "#090D16" : "#F8FAFC",
    cardBg: isDark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.85)",
    inputBg: isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(241, 245, 249, 0.9)",
    text: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.3)", // Emerald glass border tint
    primary: "#10B981",
    glassGlow: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)",
  };
};
