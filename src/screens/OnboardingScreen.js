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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/useAuthStore";
import { WORLD_LANGUAGES } from "../constants/languages";
import { getThemeColors } from "../theme/colors";

const TOTAL_STEPS = 11;

export default function OnboardingScreen({ navigation }) {
  const { theme, updateProfile, isLoading } = useAuthStore();
  const colors = getThemeColors(theme || "dark");

  // Wizard Steps State (Total 11 Steps)
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
  const [dailyCalories, setDailyCalories] = useState(2000);

  const handleNextStep = () => {
    if (currentStep === 2 && !name.trim()) {
      Alert.alert("Validation Error", "Please enter your name.");
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      if (currentStep === 9) {
        // Trigger calculation before moving to summary step
        handleCalculateAndSave();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalculateAndSave = async () => {
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

    setIsCalculating(true);
    setCalcStatus("Calculating BMR & TDEE...");

    setTimeout(() => {
      setCalcStatus("Optimizing Protein, Carbs & Fats split...");
    }, 1200);

    setTimeout(async () => {
      setCalcStatus("Finalizing Your Personalized Dashboard...");

      let bmr = 10 * numWeight + 6.25 * finalHeight - 5 * numAge;
      bmr = gender === "male" ? bmr + 5 : bmr - 161;

      let targetCaloriesCalc = Math.round(bmr * 1.375);
      if (goal === "weight_loss") targetCaloriesCalc -= 500;
      else if (goal === "muscle_gain") targetCaloriesCalc += 300;

      setDailyCalories(targetCaloriesCalc);

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
        dailyCalorieTarget: targetCaloriesCalc,
        proteinTarget: Math.round((targetCaloriesCalc * 0.3) / 4),
        carbsTarget: Math.round((targetCaloriesCalc * 0.4) / 4),
        fatsTarget: Math.round((targetCaloriesCalc * 0.3) / 9),
        medicalCondition: medicalCondition || "None",
        isOnboarded: true,
        isOnboardingCompleted: true,
      };

      const res = await updateProfile(profileData);
      setIsCalculating(false);

      if (!res?.success) {
        Alert.alert(
          "Save Failed",
          res?.message || "Could not save health profile.",
        );
      } else {
        setCurrentStep(11); // Move to milestone summary step
      }
    }, 2800);
  };

  const handleCompleteOnboarding = async () => {
    try {
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");
      navigation.replace("Main");
    } catch (error) {
      console.log("Error saving onboarding state:", error);
    }
  };

  if (isCalculating) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.calcOverlay,
          { backgroundColor: colors.bg },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginBottom: 20 }}
        />
        <Text style={[styles.calcTitle, { color: colors.primary }]}>
          Creating Your Custom Plan 🧬
        </Text>
        <Text style={[styles.calcSubtitle, { color: colors.textSecondary }]}>
          {calcStatus}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Progress Bar Header */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBarSegment,
              { backgroundColor: colors.border },
              index + 1 <= currentStep && { backgroundColor: colors.primary },
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Language Selection */}
        {currentStep === 1 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              Select Language 🌍
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose your preferred language
            </Text>
            <View
              style={[
                styles.langListContainer,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <ScrollView nestedScrollEnabled style={{ maxHeight: 380 }}>
                {WORLD_LANGUAGES && WORLD_LANGUAGES.length > 0 ? (
                  WORLD_LANGUAGES.map((item) => (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.langBtn,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.border,
                        },
                        language === item.name && {
                          backgroundColor: colors.glassGlow,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setLanguage(item.name)}
                    >
                      <Text style={[styles.optionText, { color: colors.text }]}>
                        {item.flag} {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text
                    style={{ color: colors.textSecondary, textAlign: "center" }}
                  >
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
            <Text style={[styles.title, { color: colors.primary }]}>
              What's Your Name? 👤
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Let us personalize your experience
            </Text>
            <Text style={[styles.label, { color: colors.text }]}>
              Full Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Salma Shahid"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Step 3: Gender Selection */}
        {currentStep === 3 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              How Do You Identify? 🧬
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Used to calculate your precise BMR
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  gender === "male" && {
                    backgroundColor: colors.glassGlow,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setGender("male")}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Male 🧔
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  gender === "female" && {
                    backgroundColor: colors.glassGlow,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setGender("female")}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Female 👩
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Age */}
        {currentStep === 4 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              How Old Are You? 🎂
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your age in years
            </Text>
            <Text style={[styles.label, { color: colors.text }]}>
              Age (Years)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 25"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Step 5: Height */}
        {currentStep === 5 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              How Tall Are You? 📏
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your height
            </Text>

            <View
              style={[
                styles.unitToggleRow,
                { backgroundColor: colors.inputBg },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.unitBtn,
                  heightUnit === "cm" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setHeightUnit("cm")}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    { color: colors.textSecondary },
                    heightUnit === "cm" && { color: "#FFF" },
                  ]}
                >
                  Centimeters (cm)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitBtn,
                  heightUnit === "ft" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setHeightUnit("ft")}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    { color: colors.textSecondary },
                    heightUnit === "ft" && { color: "#FFF" },
                  ]}
                >
                  Feet & Inches (ft/in)
                </Text>
              </TouchableOpacity>
            </View>

            {heightUnit === "cm" ? (
              <View>
                <Text style={[styles.label, { color: colors.text }]}>
                  Height (cm)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 170"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            ) : (
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Feet (ft)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    keyboardType="numeric"
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    placeholder="5"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Inches (in)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    keyboardType="numeric"
                    value={heightInches}
                    onChangeText={setHeightInches}
                    placeholder="7"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 6: Weight & Target Weight */}
        {currentStep === 6 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              Weight Goals ⚖️
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Track your current and target weight
            </Text>
            <Text style={[styles.label, { color: colors.text }]}>
              Current Weight (kg)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              Target Weight (kg)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}

        {/* Step 7: Fitness Goal */}
        {currentStep === 7 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              What's Your Fitness Goal? 🎯
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select your primary target
            </Text>
            {[
              { id: "weight_loss", label: "Weight Loss 🔥" },
              { id: "maintain", label: "Maintain Weight ⚖️" },
              { id: "muscle_gain", label: "Muscle Gain 💪" },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.goalBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  goal === item.id && {
                    backgroundColor: colors.glassGlow,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setGoal(item.id)}
              >
                <Text style={[styles.goalText, { color: colors.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 8: Activity Level */}
        {currentStep === 8 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              Activity Level 🏃‍♀️
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              How active is your daily routine?
            </Text>
            {["Not very active", "Lightly active", "Active", "Very active"].map(
              (act) => (
                <TouchableOpacity
                  key={act}
                  style={[
                    styles.goalBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                    activityLevel === act && {
                      backgroundColor: colors.glassGlow,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setActivityLevel(act)}
                >
                  <Text style={[styles.goalText, { color: colors.text }]}>
                    {act}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        )}

        {/* Step 9: Meal Preferences */}
        {currentStep === 9 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              Daily Meal Routine 🍽️
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              How many meals do you prefer daily?
            </Text>
            {[3, 4, 5].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.goalBtn,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                  preferredMealsCount === count && {
                    backgroundColor: colors.glassGlow,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setPreferredMealsCount(count)}
              >
                <Text style={[styles.goalText, { color: colors.text }]}>
                  {count} Meals / Day
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 10: Medical Condition Selection */}
        {currentStep === 10 && (
          <View>
            <Text style={[styles.title, { color: colors.primary }]}>
              Do You Have Any Medical Condition?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                    medicalCondition === item.label && {
                      backgroundColor: colors.glassGlow,
                      borderColor: colors.primary,
                    },
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                  ]}
                  onPress={() => setMedicalCondition(item.label)}
                >
                  <View>
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {item.label}
                    </Text>
                    {item.desc ? (
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 11 }}
                      >
                        {item.desc}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: colors.border },
                      medicalCondition === item.label && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 11: Milestone Summary */}
        {currentStep === 11 && (
          <View style={{ flex: 1, paddingVertical: 10 }}>
            <Text
              style={[
                styles.title,
                { textAlign: "center", fontSize: 24, color: colors.primary },
              ]}
            >
              Almost there, {name || "User"}!
            </Text>
            <Text
              style={{
                color: colors.primary,
                textAlign: "center",
                marginBottom: 20,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {targetWeight} Kg target is within reach 🙌
            </Text>

            <View
              style={{
                height: 140,
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                borderWidth: 1,
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
                  <Text style={{ color: colors.text }}>{weight} Kg</Text>
                </Text>
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: "bold",
                    textAlign: "right",
                  }}
                >
                  Target Weight{"\n"}
                  <Text style={{ color: colors.text }}>
                    {targetWeight || 75} Kg
                  </Text>
                </Text>
              </View>

              <View
                style={{
                  width: "100%",
                  height: 2,
                  backgroundColor: colors.primary,
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
                    backgroundColor: colors.primary,
                    position: "absolute",
                    right: 20,
                    top: -5,
                  }}
                />
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  marginTop: 25,
                }}
              >
                80% of NutriMorph users maintain their weight loss successfully
              </Text>
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 10,
              }}
            >
              Your Journey Overview, {name || "User"}
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
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Goal
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  {goal === "weight_loss"
                    ? "Weight Loss"
                    : goal === "muscle_gain"
                      ? "Muscle Gain"
                      : "Maintenance"}
                </Text>
              </View>
              <View
                style={{
                  width: "48%",
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Calories Budget
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  {dailyCalories} kcal
                </Text>
              </View>
              <View
                style={{
                  width: "48%",
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Meals Routine
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 4,
                  }}
                >
                  {preferredMealsCount} Meals / Day
                </Text>
              </View>
              <View
                style={{
                  width: "48%",
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Water Intake
                </Text>
                <Text
                  style={{
                    color: colors.text,
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

        {/* Navigation Buttons Row */}
        <View style={styles.navRow}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[
                styles.backBtn,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
              onPress={handlePrevStep}
            >
              <Text
                style={[styles.backBtnText, { color: colors.textSecondary }]}
              >
                Back
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              currentStep === 1 && { flex: 1 },
            ]}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  calcOverlay: {
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  calcTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  calcSubtitle: {
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
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  langListContainer: {
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
  },
  langBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  unitToggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  unitBtnText: {
    fontWeight: "bold",
    fontSize: 13,
  },
  optionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  optionText: { fontWeight: "bold" },
  goalBtn: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  goalText: { fontWeight: "bold" },
  navRow: { flexDirection: "row", gap: 10, marginTop: 25 },
  backBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  backBtnText: { fontSize: 16, fontWeight: "bold" },
  submitBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});
