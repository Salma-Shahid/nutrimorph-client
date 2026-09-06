export const calculateBMI = (weightKg, heightCm) => {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);

  if (!w || !h || h <= 0) return null;

  const heightMeters = h / 100;
  const bmiVal = (w / (heightMeters * heightMeters)).toFixed(1);

  let category = "";
  let color = "#4CAF50"; // Green

  if (bmiVal < 18.5) {
    category = "Underweight ⚠️";
    color = "#FFC107";
  } else if (bmiVal >= 18.5 && bmiVal <= 24.9) {
    category = "Normal Weight ✅";
    color = "#4CAF50";
  } else if (bmiVal >= 25 && bmiVal <= 29.9) {
    category = "Overweight ⚠️";
    color = "#FF9800";
  } else {
    category = "Obese 🚨";
    color = "#F44336";
  }

  return { bmi: bmiVal, category, color };
};
