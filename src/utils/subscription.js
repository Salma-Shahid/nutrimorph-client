// Mirrors nutrimorph-backend/utils/isProUser.js exactly, so the app never shows
// FREE for an account the server treats as Pro (or the reverse).
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const INACTIVE_STATUSES = new Set([
  "canceled",
  "cancelled",
  "past_due",
  "paused",
  "expired",
  "revoked",
]);

export const isActiveProUser = (user, now = Date.now()) => {
  if (!user || user.subscriptionTier !== "pro") return false;

  const status = String(user.subscriptionStatus || "").toLowerCase();
  if (INACTIVE_STATUSES.has(status)) return false;
  if (!ACTIVE_STATUSES.has(status) && user.isPro !== true) return false;

  if (!user.subscriptionExpiresAt) return true;
  const expiresAt = new Date(user.subscriptionExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now;
};

export const getPlanLabel = (user) => {
  if (!isActiveProUser(user)) return "FREE";
  return String(user.subscriptionStatus).toLowerCase() === "trialing"
    ? "TRIAL"
    : "PRO";
};
