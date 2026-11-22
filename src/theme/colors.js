export const getThemeColors = (theme) => {
  const isDark = theme === "dark";

  return {
    bg: isDark ? "#0B0F19" : "#F4F7FA",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    inputBg: isDark ? "#0E1522" : "#EDF2F7",
    text: isDark ? "#F4F7FA" : "#101827",
    textSecondary: isDark ? "#9AA9BC" : "#5D6B7D",
    border: isDark ? "#263449" : "#D7E0EA",
    primary: isDark ? "#34D399" : "#047857",
    secondary: isDark ? "#38BDF8" : "#0369A1",
    glassGlow: isDark
      ? "rgba(52, 211, 153, 0.12)"
      : "rgba(4, 120, 87, 0.08)",
    neonGlow: isDark
      ? "rgba(52, 211, 153, 0.3)"
      : "rgba(4, 120, 87, 0.16)",
    cardBgGlow: isDark ? "#151F2E" : "#F8FAFC",
  };
};
