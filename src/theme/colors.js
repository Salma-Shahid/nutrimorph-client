export const getThemeColors = (mode = "dark") => {
  if (mode === "light") {
    return {
      background: "#F8FAFC",
      cardBg: "#FFFFFF",
      text: "#0F172A",
      subText: "#475569",
      border: "#E2E8F0",
      inputBg: "#F1F5F9",
      accent: "#10B981",
    };
  }

  return {
    background: "#0F172A",
    cardBg: "#1E293B",
    text: "#FFFFFF",
    subText: "#94A3B8",
    border: "#334155",
    inputBg: "#0F172A",
    accent: "#10B981",
  };
};
