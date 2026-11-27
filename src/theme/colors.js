// Theme tokens. Dark and light expose the same keys so every card, state and
// feature built for one mode renders correctly in the other.
//
// Light mode uses a soft mint-tinted off-white surface with white cards and
// crisp borders (instead of a flat grey-white). Neon accents stay subtle there
// for readability; dark mode carries the brighter admin-style glow.
export const getThemeColors = (theme) => {
  const isDark = theme === "dark";

  return {
    isDark,
    bg: isDark ? "#0B0F19" : "#EEF6F2",
    cardBg: isDark ? "#111827" : "#FFFFFF",
    inputBg: isDark ? "#0E1522" : "#F4F9F7",
    text: isDark ? "#F4F7FA" : "#0F1B2A",
    textSecondary: isDark ? "#9AA9BC" : "#4A5A6C",
    border: isDark ? "#263449" : "#D4E5DE",
    primary: isDark ? "#34D399" : "#047857",
    secondary: isDark ? "#38BDF8" : "#0369A1",
    glassGlow: isDark ? "rgba(52, 211, 153, 0.12)" : "rgba(4, 120, 87, 0.08)",
    neonGlow: isDark ? "rgba(52, 211, 153, 0.3)" : "rgba(4, 120, 87, 0.16)",
    cardBgGlow: isDark ? "#151F2E" : "#F2F9F6",

    // Neon card system (see components/NeonCard.js).
    neonBorder: isDark ? "rgba(52, 211, 153, 0.28)" : "rgba(4, 120, 87, 0.18)",
    neonBorderActive: isDark ? "#34D399" : "rgba(4, 120, 87, 0.55)",
    neonShadow: isDark ? "#34D399" : "#047857",
    neonShadowOpacity: isDark ? 0.45 : 0.14,
    pressedBg: isDark ? "#16243A" : "#E6F4EE",
    cardShadow: isDark ? "#000000" : "#0F3D2E",
    cardShadowOpacity: isDark ? 0.35 : 0.07,

    // Semantic colours, tuned per mode for contrast on cardBg.
    success: isDark ? "#34D399" : "#047857",
    danger: isDark ? "#F87171" : "#DC2626",
    dangerBg: isDark ? "rgba(248, 113, 113, 0.12)" : "rgba(220, 38, 38, 0.07)",
    warning: isDark ? "#FBBF24" : "#B45309",
    info: isDark ? "#38BDF8" : "#0369A1",
    onPrimary: "#FFFFFF",
    overlay: isDark ? "rgba(0,0,0,0.6)" : "rgba(15,27,42,0.45)",
  };
};

// Per-accent neon colours for cards that are not primary-green
// (water = sky, exercise = red, etc.), softened in light mode.
export const getAccentNeon = (accent, theme) => {
  const isDark = theme === "dark";
  const base = {
    green: isDark ? "#34D399" : "#047857",
    sky: isDark ? "#38BDF8" : "#0369A1",
    red: isDark ? "#F87171" : "#DC2626",
    amber: isDark ? "#FBBF24" : "#B45309",
    violet: isDark ? "#A78BFA" : "#6D28D9",
  }[accent] || (isDark ? "#34D399" : "#047857");
  return base;
};
