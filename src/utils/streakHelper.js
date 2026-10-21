// Helper to check and update streak
export const calculateStreak = (lastLoggedDate, currentStreak) => {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  if (!lastLoggedDate) {
    return { streak: 1, lastLoggedDate: today };
  }

  if (lastLoggedDate === today) {
    return { streak: currentStreak, lastLoggedDate: today }; // Already logged today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  if (lastLoggedDate === yesterdayStr) {
    return { streak: currentStreak + 1, lastLoggedDate: today }; // Consecutive day!
  }

  // Broken streak
  return { streak: 1, lastLoggedDate: today };
};
