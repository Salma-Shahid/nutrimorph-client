export const getBmiInfo = (weightKg, heightCm) => {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return null;
  }

  const value = Number((weight / Math.pow(height / 100, 2)).toFixed(1));
  const category =
    value < 18.5
      ? "Underweight"
      : value < 25
        ? "Normal"
        : value < 30
          ? "Overweight"
          : "Obese";
  return { value, category };
};

export const calculateBMI = (weightKg, heightCm) => {
  const info = getBmiInfo(weightKg, heightCm);
  if (!info) return null;

  const color =
    info.category === "Underweight"
      ? "#FFC107"
      : info.category === "Normal"
        ? "#4CAF50"
        : info.category === "Overweight"
          ? "#FF9800"
          : "#F44336";
  return { bmi: info.value.toFixed(1), category: info.category, color };
};
