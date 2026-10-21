import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";
import { WORLD_LANGUAGES } from "../constants/languages";

export default function OnboardingScreen() {
  // Wizard Steps State (Total 9 Steps)
  const [currentStep, setCurrentStep] = useState(1);

  // Loading Calculation Overlay State
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcStatus, setCalcStatus] = useState("Analyzing your metrics...");

  // Form Data States
  const [language, setLanguage] = useState("English");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState("25");

  // Height Unit Toggle State ('cm' or 'ft')
  const [heightUnit, setHeightUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("170");
  const [heightFeet, setHeightFeet] = useState("5");
  const [heightInches, setHeightInches] = useState("7");

  const [weight, setWeight] = useState("70");
  const [targetWeight, setTargetWeight] = useState("65");
  const [goal, setGoal] = useState("weight_loss");
  const [activityLevel, setActivityLevel] = useState("Lightly active");
  const [preferredMealsCount, setPreferredMealsCount] = useState(4);
  const [medicalCondition, setMedicalCondition] = useState("None");

  const { updateProfile, isLoading } = useAuthStore();

  const handleNextStep = () => {
    if (currentStep === 2 && !name.trim()) {
      Alert.alert("Validation Error", "Please enter your name.");
      return;
    }
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCalculateAndSave();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalculateAndSave = async () => {
    // Determine effective Height in CM
    let finalHeight = parseFloat(heightCm);
    if (heightUnit === "ft") {
      const ft = parseFloat(heightFeet) || 0;
      const inch = parseFloat(heightInches) || 0;
      finalHeight = Math.round((ft * 12 + inch) * 2.54);
    }

    if (!age || !weight || !finalHeight) {
      Alert.alert(
        "Validation Error",
        "Please fill all required health fields.",
      );
      return;
    }

    const numAge = parseInt(age);
    const numWeight = parseFloat(weight);
    const numTargetWeight = parseFloat(targetWeight);

    if (isNaN(numAge) || isNaN(numWeight) || isNaN(finalHeight)) {
      Alert.alert("Invalid Input", "Please enter valid numeric values.");
      return;
    }

    // 🌟 Start Final Plan Calculation Animation Overlay
    setIsCalculating(true);
    setCalcStatus("Calculating BMR & TDEE...");

    setTimeout(() => {
      setCalcStatus("Optimizing Protein, Carbs & Fats split...");
    }, 1200);

    setTimeout(async () => {
      setCalcStatus("Finalizing Your Personalized Dashboard...");

      // 1. Basic BMR / TDEE Macro Calculation (Mifflin-St Jeor formula)
      let bmr = 10 * numWeight + 6.25 * finalHeight - 5 * numAge;
      bmr = gender === "male" ? bmr + 5 : bmr - 161;

      let targetCalories = Math.round(bmr * 1.375); // Default activity multiplier

      if (goal === "weight_loss") targetCalories -= 500;
      else if (goal === "muscle_gain") targetCalories += 300;

      const profileData = {
        language,
        name,
        age: numAge,
        gender,
        weight: numWeight,
        height: finalHeight,
        targetWeight: numTargetWeight,
        fitnessGoal: goal,
        activityLevel,
        preferredMealsCount,
        dailyCalorieTarget: targetCalories,
        proteinTarget: Math.round((targetCalories * 0.3) / 4),
        carbsTarget: Math.round((targetCalories * 0.4) / 4),
        fatsTarget: Math.round((targetCalories * 0.3) / 9),
        medicalCondition: medicalCondition || "None",
        isOnboarded: true,
        isOnboardingCompleted: true,
      };

      // 2. Call Store API
      const res = await updateProfile(profileData);
      setIsCalculating(false);

      if (!res?.success) {
        Alert.alert(
          "Save Failed",
          res?.message || "Could not save health profile.",
        );
      }
    }, 2800);
  };

  // Render Calculation Overlay
  if (isCalculating) {
    return (
      <SafeAreaView style={[styles.container, styles.calcOverlay]}>
        <ActivityIndicator
          size="large"
          color="#4CAF50"
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.calcTitle}>Creating Your Custom Plan 🧬</Text>
        <Text style={styles.calcSubtitle}>{calcStatus}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar Header */}
      <View style={styles.progressContainer}>
        {Array.from({ length: 9 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBarSegment,
              index + 1 <= currentStep
                ? styles.activeSegment
                : styles.inactiveSegment,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Language Selection (30+ Global Languages) */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.title}>Select Language 🌍</Text>
            <Text style={styles.subtitle}>Choose your preferred language</Text>
            <View style={styles.langListContainer}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 380 }}>
                {WORLD_LANGUAGES && WORLD_LANGUAGES.length > 0 ? (
                  WORLD_LANGUAGES.map((item) => (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.langBtn,
                        language === item.name && styles.selectedOption,
                      ]}
                      onPress={() => setLanguage(item.name)}
                    >
                      <Text style={styles.optionText}>
                        {item.flag} {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ color: "#FFF", textAlign: "center" }}>
                    Loading languages...
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Step 2: User Name */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.title}>What's Your Name? 👤</Text>
            <Text style={styles.subtitle}>
              Let us personalize your experience
            </Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. User Name"
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 3: Gender Selection */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.title}>How Do You Identify? 🧬</Text>
            <Text style={styles.subtitle}>
              Used to calculate your precise BMR
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  gender === "male" && styles.selectedOption,
                ]}
                onPress={() => setGender("male")}
              >
                <Text style={styles.optionText}>Male 🧔</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  gender === "female" && styles.selectedOption,
                ]}
                onPress={() => setGender("female")}
              >
                <Text style={styles.optionText}>Female 👩</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Age / Birthday */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.title}>How Old Are You? 🎂</Text>
            <Text style={styles.subtitle}>Enter your age in years</Text>
            <Text style={styles.label}>Age (Years)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 25"
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 5: Height (With CM / Inches Unit Toggle) */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.title}>How Tall Are You? 📏</Text>
            <Text style={styles.subtitle}>Enter your height</Text>

            {/* Unit Toggle Buttons */}
            <View style={styles.unitToggleRow}>
              <TouchableOpacity
                style={[
                  styles.unitBtn,
                  heightUnit === "cm" && styles.activeUnitBtn,
                ]}
                onPress={() => setHeightUnit("cm")}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    heightUnit === "cm" && styles.activeUnitBtnText,
                  ]}
                >
                  Centimeters (cm)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitBtn,
                  heightUnit === "ft" && styles.activeUnitBtn,
                ]}
                onPress={() => setHeightUnit("ft")}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    heightUnit === "ft" && styles.activeUnitBtnText,
                  ]}
                >
                  Feet & Inches (ft/in)
                </Text>
              </TouchableOpacity>
            </View>

            {/* CM Input Mode */}
            {heightUnit === "cm" ? (
              <View>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 170"
                  placeholderTextColor="#666"
                />
              </View>
            ) : (
              /* Feet & Inches Input Mode */
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Feet (ft)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    placeholder="5"
                    placeholderTextColor="#666"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Inches (in)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={heightInches}
                    onChangeText={setHeightInches}
                    placeholder="7"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 6: Weight & Target Weight */}
        {currentStep === 6 && (
          <View>
            <Text style={styles.title}>Weight Goals ⚖️</Text>
            <Text style={styles.subtitle}>
              Track your current and target weight
            </Text>
            <Text style={styles.label}>Current Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor="#666"
            />
            <Text style={styles.label}>Target Weight (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholderTextColor="#666"
            />
          </View>
        )}

        {/* Step 7: Fitness Goal */}
        {currentStep === 7 && (
          <View>
            <Text style={styles.title}>What's Your Fitness Goal? 🎯</Text>
            <Text style={styles.subtitle}>Select your primary target</Text>
            <TouchableOpacity
              style={[
                styles.goalBtn,
                goal === "weight_loss" && styles.selectedGoal,
              ]}
              onPress={() => setGoal("weight_loss")}
            >
              <Text style={styles.goalText}>Weight Loss 🔥</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.goalBtn,
                goal === "maintain" && styles.selectedGoal,
              ]}
              onPress={() => setGoal("maintain")}
            >
              <Text style={styles.goalText}>Maintain Weight ⚖️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.goalBtn,
                goal === "muscle_gain" && styles.selectedGoal,
              ]}
              onPress={() => setGoal("muscle_gain")}
            >
              <Text style={styles.goalText}>Muscle Gain 💪</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 8: Activity Level */}
        {currentStep === 8 && (
          <View>
            <Text style={styles.title}>Activity Level 🏃‍♀️</Text>
            <Text style={styles.subtitle}>
              How active is your daily routine?
            </Text>
            {["Not very active", "Lightly active", "Active", "Very active"].map(
              (act) => (
                <TouchableOpacity
                  key={act}
                  style={[
                    styles.goalBtn,
                    activityLevel === act && styles.selectedGoal,
                  ]}
                  onPress={() => setActivityLevel(act)}
                >
                  <Text style={styles.goalText}>{act}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        )}

        {/* Step 9: Meal Preferences */}
        {currentStep === 9 && (
          <View>
            <Text style={styles.title}>Daily Meal Routine 🍽️</Text>
            <Text style={styles.subtitle}>
              How many meals do you prefer daily?
            </Text>
            {[3, 4, 5].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.goalBtn,
                  preferredMealsCount === count && styles.selectedGoal,
                ]}
                onPress={() => setPreferredMealsCount(count)}
              >
                <Text style={styles.goalText}>{count} Meals / Day</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Medical Condition Selection Step */}
        {currentStep === 10 && (
          <View>
            <Text style={styles.title}>Do You Have Any Medical Condition?</Text>
            <Text style={styles.subtitle}>
              Let us know if you have any medical condition that we should
              consider while customizing plans for you.
            </Text>

            <View style={{ gap: 10, marginVertical: 15 }}>
              {[
                { label: "None", desc: "" },
                { label: "Diabetes", desc: "" },
                { label: "Pre-Diabetes", desc: "" },
                { label: "Cholesterol", desc: "" },
                { label: "Hypertension", desc: "" },
                { label: "PCOS", desc: "" },
                { label: "Thyroid", desc: "" },
                { label: "Physical Injury", desc: "Sprains" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.langBtn,
                    medicalCondition === item.label && styles.selectedOption,
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                  ]}
                  onPress={() => setMedicalCondition(item.label)}
                >
                  <View>
                    <Text style={styles.optionText}>{item.label}</Text>
                    {item.desc ? (
                      <Text style={{ color: "#888", fontSize: 11 }}>
                        {item.desc}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      medicalCondition === item.label && styles.radioSelected,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 🟢 STEP 11: PASTE YOUR MILESTONE SUMMARY CODE HERE */}
        {currentStep === 11 && (
          <View style={{ flex: 1, paddingVertical: 10 }}>
            <Text style={[styles.title, { textAlign: "center", fontSize: 24 }]}>
              Almost there, {name || "Media"}!
            </Text>
            <Text
              style={{
                color: "#10B981",
                textAlign: "center",
                marginBottom: 20,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {targetWeight} Kg by 21 Oct 26 is within reach 🙌
            </Text>

            {/* SVG Curve Progress Visual Representation */}
            <View
              style={{
                height: 140,
                backgroundColor: "#111827",
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 20,
                padding: 15,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                  position: "absolute",
                  top: 15,
                  paddingHorizontal: 15,
                }}
              >
                <Text
                  style={{ color: "#EF4444", fontSize: 12, fontWeight: "bold" }}
                >
                  Current Weight{"\n"}
                  <Text style={{ color: "#FFF" }}>{weight} Kg</Text>
                </Text>
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: 12,
                    fontWeight: "bold",
                    textAlign: "right",
                  }}
                >
                  Target Weight{"\n"}
                  <Text style={{ color: "#FFF" }}>{targetWeight || 75} Kg</Text>
                </Text>
              </View>

              {/* Simple Simulated Curve Line */}
              <View
                style={{
                  width: "100%",
                  height: 2,
                  backgroundColor: "#10B981",
                  marginTop: 30,
                  position: "relative",
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#EF4444",
                    position: "absolute",
                    left: 20,
                    top: -5,
                  }}
                />
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#10B981",
                    position: "absolute",
                    right: 20,
                    top: -5,
                  }}
                />
              </View>
              <Text style={{ color: "#888", fontSize: 11, marginTop: 25 }}>
                80% of NutriMorph users maintain their weight loss even 6 months
                later
              </Text>
            </View>

            {/* Journey Overview Cards Grid */}
            <Text
              style={{
                color: "#FFF",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 10,
              }}
            >
              Your Journey Overview, {name || "Media"}
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#888", fontSize: 12 }}>Goal</Text>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  {fitnessGoal || "Weight Loss"}
                </Text>
              </View>
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#888", fontSize: 12 }}>
                  Calories Budget
                </Text>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  {dailyCalories || 1812} kcal
                </Text>
              </View>
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#888", fontSize: 12 }}>Duration</Text>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  {durationWeeks || 8} Weeks
                </Text>
              </View>
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#888", fontSize: 12 }}>
                  Water Intake
                </Text>
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  2000 ml
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🔘 Navigation Buttons (Back / Continue) */}
        <View style={styles.buttonContainer}>
          {/* Continue Button logic for step 11 should navigate to Dashboard */}
        </View>

        {/* Navigation Buttons Row */}
        {/* Navigation Buttons Row */}
        <View style={styles.navRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={handlePrevStep}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, currentStep === 1 && { flex: 1 }]}
            onPress={
              currentStep === 11 ? handleCompleteOnboarding : handleNextStep
            }
            disabled={isLoading || isCalculating}
          >
            {isLoading || isCalculating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {currentStep === 9
                  ? "Calculate Target"
                  : currentStep === 11
                    ? "Get Started 🚀"
                    : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Dedicated Onboarding Completion Handler
const handleCompleteOnboarding = async () => {
  try {
    await AsyncStorage.setItem("hasCompletedOnboarding", "true");
    navigation.replace("Main");
  } catch (error) {
    console.log("Error saving onboarding state:", error);
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  calcOverlay: {
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  calcTitle: {
    color: "#4CAF50",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  calcSubtitle: {
    color: "#CCC",
    fontSize: 15,
    textAlign: "center",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 15,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeSegment: { backgroundColor: "#4CAF50" },
  inactiveSegment: { backgroundColor: "#333" },
  content: { padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#AAA",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#FFF",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  row: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  langListContainer: {
    backgroundColor: "#181818",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  langBtn: {
    padding: 14,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 8,
  },
  unitToggleRow: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    padding: 4,
    marginBottom: 15,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeUnitBtn: {
    backgroundColor: "#4CAF50",
  },
  unitBtnText: {
    color: "#AAA",
    fontWeight: "bold",
    fontSize: 13,
  },
  activeUnitBtnText: {
    color: "#FFF",
  },
  optionBtn: {
    flex: 1,
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 10,
  },
  selectedOption: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  optionText: { color: "#FFF", fontWeight: "bold" },
  goalBtn: {
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  selectedGoal: { backgroundColor: "#1B382B", borderColor: "#4CAF50" },
  goalText: { color: "#FFF", fontWeight: "bold" },
  navRow: { flexDirection: "row", gap: 10, marginTop: 25 },
  backBtn: {
    flex: 1,
    backgroundColor: "#222",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  backBtnText: { color: "#AAA", fontSize: 16, fontWeight: "bold" },
  submitBtn: {
    flex: 2,
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
