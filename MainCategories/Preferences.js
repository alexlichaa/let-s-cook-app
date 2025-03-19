// Preferences.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ImageBackground,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Alert, // For user feedback
} from 'react-native';
import { ProgressCircle } from 'react-native-svg-charts'; // A library for circular charts
import { Picker } from '@react-native-picker/picker';
import firebase from 'firebase';

const Preferences = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedDiet, setSelectedDiet] = useState('');
  const [combinedMeals, setCombinedMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [finalFilteredMeals, setFinalFilteredMeals] = useState([]); // **Added State**
  const [loading, setLoading] = useState(false);
  const [bmiDetails, setBmiDetails] = useState({
    weight: '',
    weightUnit: 'Kg',
    height: '',
    heightUnit: 'cm',
    feet: '',
    inches: '',
  });
  const [bmi, setBmi] = useState(0);

  const cuisines = [
    'American',
    'British',
    'French',
    'Italian',
    'Chinese',
    'Indian',
    'Japanese',
  ];

  const diets = [
    'High protein-high carbs',
    'High protein-low carbs',
    'High protein-low sugar',
    'High carbs-low sugar',
    'Low carbs-low sugar',
    'High protein-high carbs-low sugar',
    'High protein-low carbs-low sugar',
  ];

  const dietConditionsMap = {
    'High protein-high carbs': {
      protein_g: (value) => value > 100,
      carbohydrates_total_g: (value) => value > 350,
    },
    'High protein-low carbs': {
      protein_g: (value) => value > 100,
      carbohydrates_total_g: (value) => value < 300,
    },
    'High protein-low sugar': {
      protein_g: (value) => value > 100,
      sugar_g: (value) => value < 75,
    },
    'High carbs-low sugar': {
      carbohydrates_total_g: (value) => value > 350,
      sugar_g: (value) => value < 75,
    },
    'Low carbs-low sugar': {
      carbohydrates_total_g: (value) => value < 300,
      sugar_g: (value) => value < 75,
    },
    'High protein-high carbs-low sugar': {
      protein_g: (value) => value > 100,
      carbohydrates_total_g: (value) => value > 350,
      sugar_g: (value) => value < 75,
    },
    'High protein-low carbs-low sugar': {
      protein_g: (value) => value > 100,
      carbohydrates_total_g: (value) => value < 300,
      sugar_g: (value) => value < 75,
    },
  };

  const handleCuisineSelect = (cuisine) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter((item) => item !== cuisine));
    } else if (selectedCuisines.length < 2) {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const fetchMeals = async (cuisine) => {
    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?a=${cuisine}`
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error(`Error fetching meals for ${cuisine}:`, error);
      return [];
    }
  };

  const fetchMealDetails = async (mealId) => {
    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
      );
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error(`Error fetching details for meal ID ${mealId}:`, error);
      return null;
    }
  };

  const fetchNutritionData = async (mealDetail) => {
    const ingredients = Array.from({ length: 20 })
      .map((_, index) => {
        const ingredient = mealDetail[`strIngredient${index + 1}`];
        const measure = mealDetail[`strMeasure${index + 1}`];
        return ingredient && measure ? `${measure} ${ingredient}` : null;
      })
      .filter(Boolean)
      .join(', ');

    if (!ingredients) return null;

    try {
      const response = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
          ingredients
        )}`,
        {
          headers: { 'X-Api-Key': 'P3KS2zRUAhS+RK5r7T42PQ==3O3WWMPRtQzW3tCX' },
        }
      );
      const data = await response.json();
      return calculateTotalRow(data.items || []);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      return null;
    }
  };

  const calculateTotalRow = (items) => {
    const total = {
      protein_g: items.reduce((sum, item) => sum + (item.protein_g || 0), 0),
      carbohydrates_total_g: items.reduce(
        (sum, item) => sum + (item.carbohydrates_total_g || 0),
        0
      ),
      sugar_g: items.reduce((sum, item) => sum + (item.sugar_g || 0), 0),
      fat_g: items.reduce((sum, item) => sum + (item.fat_total_g || 0), 0),
    };

    return {
      protein_g: parseFloat(total.protein_g.toFixed(1)),
      carbohydrates_total_g: parseFloat(total.carbohydrates_total_g.toFixed(1)),
      sugar_g: parseFloat(total.sugar_g.toFixed(1)),
      fat_g: parseFloat(total.fat_g.toFixed(1)), // **Added fat_g**
    };
  };

  const handleNext = async () => {
    if (step === 3) {
      // **Step 3: Calculate BMI and Filter by Fat**
      // Calculate BMI
      const weightInKg =
        bmiDetails.weightUnit === 'Kg'
          ? parseFloat(bmiDetails.weight)
          : parseFloat(bmiDetails.weight) * 0.453592;

      const heightInMeters =
        bmiDetails.heightUnit === 'cm'
          ? parseFloat(bmiDetails.height) / 100
          : parseFloat(bmiDetails.feet) / 3.281 +
            parseFloat(bmiDetails.inches) / 39.37;

      if (heightInMeters === 0 || isNaN(heightInMeters)) {
        setBmi(0);
        Alert.alert('Invalid Input', 'Height cannot be zero or invalid.');
        return;
      }

      const calculatedBmi = weightInKg / (heightInMeters * heightInMeters);
      const roundedBmi = parseFloat(calculatedBmi.toFixed(1));
      setBmi(roundedBmi);
      console.log(`Calculated BMI: ${roundedBmi}`);

      // Filter based on BMI and fat conditions
      let finalFiltered = filteredMeals;

      if (roundedBmi < 18.5) {
        finalFiltered = filteredMeals.filter(
          (meal) => meal.nutritionData.fat_g > 200
        );
        console.log(
          'BMI < 18.5: Filtered Meals with fat > 200g:',
          finalFiltered
        );
      } else if (roundedBmi >= 18.5 && roundedBmi < 25) {
        // No fat condition, keep all filtered meals
        console.log(
          'BMI 18.5-25: No additional fat filtering applied.',
          finalFiltered
        );
      } else if (roundedBmi >= 25 && roundedBmi < 30) {
        finalFiltered = filteredMeals.filter(
          (meal) => meal.nutritionData.fat_g < 150
        );
        console.log(
          'BMI 25-30: Filtered Meals with fat < 150g:',
          finalFiltered
        );
      } else if (roundedBmi >= 30) {
        finalFiltered = filteredMeals.filter(
          (meal) => meal.nutritionData.fat_g < 100
        );
        console.log('BMI > 30: Filtered Meals with fat < 100g:', finalFiltered);
      }

      setFinalFilteredMeals(finalFiltered); // **Set to State**

      // Proceed to next step (BMI Results)
      setStep(step + 1);
    } else if (step === 1 && selectedCuisines.length === 2) {
      // **Step 1: Select Cuisines and Fetch Meals**
      setLoading(true);
      try {
        const [meals1, meals2] = await Promise.all(
          selectedCuisines.map((cuisine) => fetchMeals(cuisine))
        );
        const combined = [...meals1, ...meals2];
        setCombinedMeals(combined);
        console.log('Combined Meals:', combined);
      } catch (error) {
        console.error('Error fetching meals:', error);
      } finally {
        setLoading(false);
        setStep(step + 1);
      }
    } else if (step === 2 && selectedDiet) {
      // **Step 2: Select Diet Preference and Filter Meals**
      setLoading(true);
      try {
        const conditions = dietConditionsMap[selectedDiet];
        if (!conditions) {
          console.error('No conditions mapped for the selected diet.');
          Alert.alert('Error', 'Invalid diet selection.');
          return;
        }

        const filtered = [];

        // Iterate over combined meals and apply conditions
        for (const meal of combinedMeals) {
          const mealDetail = await fetchMealDetails(meal.idMeal);
          if (!mealDetail) {
            console.log(`No details found for meal ID: ${meal.idMeal}`);
            continue;
          }

          const nutritionData = await fetchNutritionData(mealDetail);
          if (!nutritionData) {
            console.log(`No nutrition data found for meal ID: ${meal.idMeal}`);
            continue;
          }

          // Check all conditions
          let meetsAllConditions = true;
          for (const [key, conditionFn] of Object.entries(conditions)) {
            if (nutritionData[key] === undefined) {
              console.log(
                `Nutrient "${key}" is undefined for meal "${meal.strMeal}".`
              );
              meetsAllConditions = false;
              break;
            }
            if (!conditionFn(nutritionData[key])) {
              console.log(
                `Meal "${meal.strMeal}" does not meet the condition for "${key}".`
              );
              meetsAllConditions = false;
              break;
            }
          }

          if (meetsAllConditions) {
            filtered.push({ ...meal, nutritionData });
            console.log(`Meal "${meal.strMeal}" meets all conditions.`);
          }
        }

        setFilteredMeals(filtered);
        console.log('Filtered Meals:', filtered);
      } catch (error) {
        console.error('Error filtering meals:', error);
      } finally {
        setLoading(false);
        setStep(step + 1);
      }
    }
  };

  const handleDone = async () => {
    // **Handle Done: Save Preferences to Firestore**
    const user = firebase.auth().currentUser;

    if (!user) {
      Alert.alert('Authentication Error', 'User is not authenticated.');
      return;
    }

    const userId = user.uid;

    // Extract idMeal from finalFilteredMeals
    const preferencesIds = finalFilteredMeals.map((meal) => meal.idMeal);

    try {
      // Update the user's Preferences array in Firestore
      await firebase.firestore().collection('USERSinfo').doc(userId).update({
        Preferences: preferencesIds,
      });

      console.log(
        'Preferences successfully saved to Firestore:',
        preferencesIds
      );
      Alert.alert('Success', 'Your preferences have been saved.');
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      console.error('Error saving preferences to Firestore:', error);
      Alert.alert(
        'Firestore Error',
        'There was an error saving your preferences.'
      );
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppWallpaper.jpeg?alt=media&token=dc34798b-82ec-40ed-85ec-84a1655cf70f',
      }}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
          {step === 1 && (
            <ScrollView>
              <Text style={styles.title}>Select 2 Cuisines</Text>
              {cuisines.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine}
                  style={[
                    styles.option,
                    selectedCuisines.includes(cuisine) && styles.selectedOption,
                  ]}
                  onPress={() => handleCuisineSelect(cuisine)}>
                  <Text
                    style={[
                      styles.optionText,
                      selectedCuisines.includes(cuisine) &&
                        styles.selectedOptionText,
                    ]}>
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  { opacity: selectedCuisines.length === 2 ? 1 : 0.5 },
                ]}
                onPress={handleNext}
                disabled={selectedCuisines.length !== 2}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {step === 2 && (
            <ScrollView>
              <Text style={styles.title}>Select a Diet Preference</Text>
              {diets.map((diet) => (
                <TouchableOpacity
                  key={diet}
                  style={[
                    styles.option,
                    selectedDiet === diet && styles.selectedOption,
                  ]}
                  onPress={() => setSelectedDiet(diet)}>
                  <Text
                    style={[
                      styles.optionText,
                      selectedDiet === diet && styles.selectedOptionText,
                    ]}>
                    {diet}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.nextButton, { opacity: selectedDiet ? 1 : 0.5 }]}
                onPress={handleNext}
                disabled={!selectedDiet}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {step === 3 && (
            <ScrollView>
              <Text style={styles.title}>BMI Calculator</Text>
              {/* Weight Section */}
              <Text style={styles.subtitle}>Weight</Text>
              <View style={styles.row}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter weight"
                  keyboardType="numeric"
                  value={bmiDetails.weight}
                  onChangeText={(value) =>
                    setBmiDetails({ ...bmiDetails, weight: value })
                  }
                />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={bmiDetails.weightUnit}
                    onValueChange={(value) =>
                      setBmiDetails({ ...bmiDetails, weightUnit: value })
                    }>
                    <Picker.Item label="Kg" value="Kg" />
                    <Picker.Item label="lbs" value="lbs" />
                  </Picker>
                </View>
              </View>
              {/* Height Section */}
              <Text style={styles.subtitle}>Height</Text>
              <View style={styles.row}>
                {bmiDetails.heightUnit === 'cm' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter height in cm"
                    keyboardType="numeric"
                    value={bmiDetails.height}
                    onChangeText={(value) =>
                      setBmiDetails({ ...bmiDetails, height: value })
                    }
                  />
                )}
                {bmiDetails.heightUnit === 'feet+inches' && (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Feet"
                      keyboardType="numeric"
                      value={bmiDetails.feet}
                      onChangeText={(value) =>
                        setBmiDetails({ ...bmiDetails, feet: value })
                      }
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Inches"
                      keyboardType="numeric"
                      value={bmiDetails.inches}
                      onChangeText={(value) =>
                        setBmiDetails({ ...bmiDetails, inches: value })
                      }
                    />
                  </View>
                )}
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={bmiDetails.heightUnit}
                    onValueChange={(value) =>
                      setBmiDetails({ ...bmiDetails, heightUnit: value })
                    }>
                    <Picker.Item label="cm" value="cm" />
                    <Picker.Item label="feet" value="feet+inches" />
                  </Picker>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  {
                    opacity:
                      bmiDetails.weight &&
                      (bmiDetails.height ||
                        (bmiDetails.feet && bmiDetails.inches))
                        ? 1
                        : 0.5,
                  },
                ]}
                onPress={handleNext}
                disabled={
                  !bmiDetails.weight ||
                  (!bmiDetails.height && bmiDetails.heightUnit === 'cm') ||
                  (bmiDetails.heightUnit === 'feet+inches' &&
                    (!bmiDetails.feet || !bmiDetails.inches))
                }>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {step === 4 && (
            <ScrollView>
              <Text style={styles.bmiResultsTitle}>BMI Results</Text>
              <Text style={styles.subtitle}>Your BMI is:</Text>
              <View style={styles.resultBox}>
                <Text style={styles.bmiText}>{bmi}</Text>
              </View>

              <Text style={styles.subtitle}>BMI Diagram:</Text>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                <ProgressCircle
                  style={{ height: 200, width: 200 }}
                  progress={Math.min(bmi / 40, 1)}
                  progressColor={
                    bmi < 18.5
                      ? 'blue'
                      : bmi < 25
                      ? 'green'
                      : bmi < 30
                      ? '#B8860B'
                      : bmi < 35
                      ? 'orange'
                      : bmi < 40
                      ? 'red'
                      : 'darkred'
                  }
                />
                <Text
                  style={{
                    position: 'absolute',
                    fontSize: 20,
                    fontWeight: 'bold',
                    color:
                      bmi < 18.5
                        ? 'blue'
                        : bmi < 25
                        ? 'green'
                        : bmi < 30
                        ? '#B8860B'
                        : bmi < 35
                        ? 'orange'
                        : bmi < 40
                        ? 'red'
                        : 'darkred',
                  }}>
                  {bmi < 18.5
                    ? 'Underweight'
                    : bmi < 25
                    ? 'Normal'
                    : bmi < 30
                    ? 'Overweight'
                    : bmi < 35
                    ? 'Obese I'
                    : bmi < 40
                    ? 'Obese II'
                    : 'Obese III'}
                </Text>
              </View>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendRow}>
                  <View
                    style={[styles.legendColorBox, { backgroundColor: 'blue' }]}
                  />
                  <Text>Underweight (BMI {'<'} 18.5)</Text>
                </View>
                <View style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendColorBox,
                      { backgroundColor: 'green' },
                    ]}
                  />
                  <Text>Normal (BMI range: 18.5 - 25)</Text>
                </View>
                <View style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendColorBox,
                      { backgroundColor: '#B8860B' },
                    ]}
                  />
                  <Text>Overweight (BMI range: 25 - 30)</Text>
                </View>
                <View style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendColorBox,
                      { backgroundColor: 'orange' },
                    ]}
                  />
                  <Text>Obese I (BMI range: 30 - 35)</Text>
                </View>
                <View style={styles.legendRow}>
                  <View
                    style={[styles.legendColorBox, { backgroundColor: 'red' }]}
                  />
                  <Text>Obese II (BMI range: 35 - 40)</Text>
                </View>
                <View style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendColorBox,
                      { backgroundColor: 'darkred' },
                    ]}
                  />
                  <Text>Obese III (BMI {'≥'} 40)</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.nextButton} onPress={handleDone}>
                <Text style={styles.nextButtonText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    paddingTop: 50, // Add this to lower the content on the page
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    marginTop: 20, // Adjusted to lower the title
  },

  bmiResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'left',
    marginTop: 40, // Adjusted to lower the title
  },

  nextButton: {
    backgroundColor: 'black',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
    width: 120, // Set a smaller fixed width
    alignSelf: 'center', // Center the button within its container
  },

  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  option: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#b5b5b5',
    marginVertical: 5,
    borderRadius: 5,
  },
  selectedOption: {
    backgroundColor: '#d67c7c',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: 'black',
    fontWeight: 'bold',
  },
  resultBox: {
    borderWidth: 1,
    borderColor: '#b5b5b5',
    padding: 20,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: 'center',
  },
  bmiText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  legendContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  legendColorBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    marginRight: 10,
  },
  pickerContainer: {
    borderRadius: 5,
    width: 100,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#b5b5b5',
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
    width: 250,
    marginVertical: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 65,
  },
});

export default Preferences;
