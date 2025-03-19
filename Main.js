import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Image,
  ImageBackground,
  Dimensions,
  Modal,
  FlatList,
  Button,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import seedrandom from 'seedrandom';
import firebase from './firebaseconfig'; // Import the default firebase
import { FontAwesome } from '@expo/vector-icons';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

const Main = ({ navigation }) => {
  const navigateToPage = (page) => {
    navigation.navigate(page);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCaloriesModalVisible, setCaloriesModalVisible] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredientsOrder, setSelectedIngredientsOrder] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [selectedCalories, setSelectedCalories] = useState([]);
  const [loadedImages, setLoadedImages] = useState({});
  const [nutritionData, setNutritionData] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [mealSpecificRating, setMealSpecificRating] = useState(0);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [averageRatings, setAverageRatings] = useState({});
  const [currentMealRatings, setCurrentMealRatings] = useState({
    totalVotes: 0,
    percentages: {},
    averageRating: 0,
  });

  const calorieOptions = [
    '< 1000 kcal',
    '1000-1499 kcal',
    '1500-1999 kcal',
    '2000-2499 kcal',
    '2500-2999 kcal',
    '3000-3499 kcal',
    '3500-3999 kcal',
    '4000-4499 kcal',
    '4500-4999 kcal',
    '5000-5499 kcal',
    '5500-6000 kcal',
    '> 6000 kcal',
  ];

  // Specify the IDs of ingredients to display
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch(
          'https://www.themealdb.com/api/json/v1/1/list.php?i=list'
        );
        const data = await response.json();
        setIngredients(data.meals);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
      }
    };

    fetchIngredients();
  }, []);

  const selectedIngredientsListRef = useRef(null);

  const toggleIngredientSelection = (ingredientId) => {
    setSelectedIngredients((prevSelected) => {
      const newSelection = prevSelected.includes(ingredientId)
        ? prevSelected.filter((id) => id !== ingredientId)
        : [...prevSelected, ingredientId];

      // Update the order tracking array
      setSelectedIngredientsOrder((prevOrder) => {
        if (prevSelected.includes(ingredientId)) {
          // If removing, filter out the ingredient
          return prevOrder.filter((id) => id !== ingredientId);
        } else {
          // If adding, append to the end
          return [...prevOrder, ingredientId];
        }
      });

      // Trigger auto-scroll after adding a new ingredient
      if (
        !prevSelected.includes(ingredientId) &&
        selectedIngredientsListRef.current
      ) {
        setTimeout(() => {
          selectedIngredientsListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }

      return newSelection;
    });
  };

  // const toggleCalorieSelection = (calorieOption) => {
  //   setSelectedCalories((prevSelected) => {
  //     if (prevSelected.includes(calorieOption)) {
  //       return prevSelected.filter((option) => option !== calorieOption);
  //     } else {
  //       return [...prevSelected, calorieOption];
  //     }
  //   });
  // };

  const handleCloseModal = () => {
    setSelectedIngredients([]); // Reset selected ingredients when closing the modal
    setSelectedIngredientsOrder([]); // Reset the order of selected ingredients
    setSearchTerm('');
    setModalVisible(false);
  };

  const handleCloseCaloriesModal = () => {
    setSelectedCalories([]);
    setCaloriesModalVisible(false);
  };

  const handleNavigateToRecipes = () => {
    const selectedIngredientNames = ingredients
      .filter((item) => selectedIngredients.includes(item.idIngredient))
      .map((item) => item.strIngredient.toLowerCase());

    navigation.navigate('FilterIngredient', { selectedIngredientNames });
    setSelectedIngredients([]);
    setSelectedIngredientsOrder([]); // Reset the order of selected ingredients
    setSearchTerm('');
    setModalVisible(false);
  };

  const [dishOfTheDay, setDishOfTheDay] = useState(null);
  const [mealDetails, setMealDetails] = useState(null);
  const [mealDetailsModalVisible, setMealDetailsModalVisible] = useState(false);
  const [loadingMealDetails, setLoadingMealDetails] = useState(false);

  // const getCurrentDateSeed = () => {
  //   const currentDate = new Date();
  //   const localDateString = currentDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD in local timezone
  //   return localDateString;
  // };

  const fetchDishOfTheDay = async (seed) => {
    try {
      const excludedCategories = ['Breakfast', 'Dessert', 'Side']; // Excluded categories
      const rng = seedrandom(seed); // Generate consistent random numbers
      let validMeal = null;

      while (!validMeal) {
        const response = await fetch(
          'https://www.themealdb.com/api/json/v1/1/random.php'
        );
        const data = await response.json();
        if (data.meals && data.meals.length > 0) {
          const meal = data.meals[0];
          if (!excludedCategories.includes(meal.strCategory)) {
            validMeal = meal; // Found a valid meal
          }
        }
      }

      return validMeal;
    } catch (error) {
      console.error('Error fetching dish of the day:', error);
      return null;
    }
  };

  const updateDishOfTheDay = async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const userRef = firebase.firestore().collection('USERSinfo').doc(user.uid);

    try {
      const userDoc = await userRef.get();
      const currentDate = new Date();
      const localDateString = currentDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD

      if (userDoc.exists) {
        const userData = userDoc.data();
        const lastUpdateDate = userData.dishLastUpdated;

        // Check if 24 hours have passed
        if (lastUpdateDate !== localDateString) {
          // Fetch a new meal if the date has changed
          const newMeal = await fetchDishOfTheDay(localDateString);
          if (newMeal) {
            await userRef.set(
              {
                dishOfTheDay: newMeal,
                dishLastUpdated: localDateString,
              },
              { merge: true }
            );
            setDishOfTheDay(newMeal);
          }
        } else {
          // Use the existing dish of the day
          setDishOfTheDay(userData.dishOfTheDay);
        }
      } else {
        // First-time user: fetch a meal and save it
        const newMeal = await fetchDishOfTheDay(localDateString);
        if (newMeal) {
          await userRef.set({
            dishOfTheDay: newMeal,
            dishLastUpdated: localDateString,
          });
          setDishOfTheDay(newMeal);
        }
      }
    } catch (error) {
      console.error('Error updating Dish of the Day:', error);
    }
  };

  const fetchMealDetails = async (mealID) => {
    setLoadingMealDetails(true);
    try {
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`
      );
      const data = await response.json();
      if (data.meals && data.meals.length > 0) {
        setMealDetails(data.meals[0]);
        setMealDetailsModalVisible(true); // Show modal with meal details
        fetchNutritionData(data.meals[0]);
      }
    } catch (error) {
      console.error('Error fetching meal details:', error);
    } finally {
      setLoadingMealDetails(false);
    }
  };

  useEffect(() => {
    const initializeDishOfTheDay = async () => {
      await updateDishOfTheDay();

      // Schedule an update for midnight
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0
      );
      const millisecondsUntilMidnight = nextMidnight - now;

      const timeout = setTimeout(() => {
        updateDishOfTheDay();
      }, millisecondsUntilMidnight);

      return () => clearTimeout(timeout); // Cleanup the timeout on unmount
    };

    initializeDishOfTheDay(); // Call the function when the component mounts
  }, []);

  const [occasionMeals, setOccasionMeals] = useState({});

  const occasions = [
    {
      name: 'Christmas Dinner',
      mealIds: [
        '52990',
        '52803',
        '52812',
        '52878',
        '52772',
        '52832',
        '53011',
        '52913',
        '52914',
        '52779',
      ],
    },
    {
      name: 'Birthday Celebration',
      mealIds: [
        '52776',
        '52901',
        '52854',
        '52900',
        '52833',
        '52844',
        '52813',
        '53028',
        '53013',
      ],
    },
    {
      name: 'Summer Picnic',
      mealIds: [
        '53085',
        '53017',
        '53016',
        '52976',
        '52829',
        '53076',
        '53060',
        '52995',
      ],
    },
  ];

  // Fetch meals for each occasion
  useEffect(() => {
    const fetchOccasionMeals = async () => {
      const mealsByOccasion = {};

      for (const occasion of occasions) {
        try {
          const meals = [];

          for (const mealId of occasion.mealIds) {
            const response = await fetch(
              `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
            );
            const data = await response.json();
            meals.push(data.meals[0]); // Add the meal details to the array
          }

          mealsByOccasion[occasion.name] = meals; // Add meals to the occasion
        } catch (error) {
          console.error(`Error fetching meals for ${occasion.name}:`, error);
        }
      }

      setOccasionMeals(mealsByOccasion);
    };

    fetchOccasionMeals();
  }, []);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        try {
          const userDoc = await firebase
            .firestore()
            .collection('USERSinfo')
            .doc(user.uid)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            setProfilePhoto(userData.profilePhoto || null);
            setUsername(userData.username || '');
          }
        } catch (error) {
          console.error('Error fetching profile photo:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfilePhoto();
  }, []);

  const [isFindMealsModalVisible, setFindMealsModalVisible] = useState(false);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [fetchingMeals, setFetchingMeals] = useState(false);

  const fetchMealsByIngredients = async () => {
    setFetchingMeals(true);
    try {
      const ingredientNames = selectedIngredients
        .map(
          (id) =>
            ingredients.find((item) => item.idIngredient === id)?.strIngredient
        )
        .filter(Boolean);

      if (ingredientNames.length === 0) {
        alert('Please select ingredients before searching.');
        setFetchingMeals(false);
        return;
      }

      const query = ingredientNames.join(',');
      const response = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?i=${query}`
      );
      const data = await response.json();

      if (data.meals) {
        // Filter meals that include all selected ingredients
        const matchingMeals = data.meals.filter((meal) => {
          const ingredientList = ingredientNames.map((name) =>
            meal.strIngredient?.toLowerCase().includes(name.toLowerCase())
          );
          return ingredientList.every(Boolean);
        });

        setFilteredMeals(matchingMeals);
      } else {
        setFilteredMeals([]);
      }
    } catch (error) {
      console.error('Error fetching meals by ingredients:', error);
      alert('Error fetching meals. Please try again.');
    } finally {
      setFetchingMeals(false);
    }
  };

  const fetchMealsByCalories = () => {
    if (selectedCalories.length === 0) {
      alert('Please select a calorie range.');
      return;
    }

    // Navigate to the FilterByCalories screen with the selected calorie range
    navigation.navigate('FilterByCalories', {
      selectedCalories: selectedCalories[0],
    });

    // Reset state and close modal
    setSelectedCalories([]);
    setCaloriesModalVisible(false);
  };

  // Fetch ratings for a meal
  const fetchRatings = async (mealID) => {
    try {
      const ratingsDoc = await firebase
        .firestore()
        .collection('Ratings')
        .doc(mealID)
        .get();
      const ratings = ratingsDoc.exists ? ratingsDoc.data().ratings : {};
      return ratings;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      return {};
    }
  };

  // Calculate ratings data
  const calculateRatingsData = (ratings) => {
    const totalVotes = Object.values(ratings).reduce(
      (sum, count) => sum + count,
      0
    );

    const percentages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const [star, count] of Object.entries(ratings)) {
      percentages[star] = Math.round((count / totalVotes) * 100);
    }

    const averageRating =
      totalVotes === 0
        ? 'Not rated yet'
        : (
            Object.entries(ratings).reduce(
              (sum, [star, count]) => sum + star * count,
              0
            ) / totalVotes
          ).toFixed(2);

    return { totalVotes, percentages, averageRating };
  };
  const fetchNutritionData = (mealDetail) => {
    const ingredients = Array.from({ length: 20 })
      .map((_, index) => {
        const ingredient = mealDetail[`strIngredient${index + 1}`];
        const measure = mealDetail[`strMeasure${index + 1}`];
        return ingredient && measure ? `${measure} ${ingredient}` : null;
      })
      .filter(Boolean)
      .join(', ');

    if (!ingredients) {
      setNutritionData([]);
      return;
    }

    setLoadingNutrition(true);

    fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
        ingredients
      )}`,
      {
        headers: { 'X-Api-Key': 'P3KS2zRUAhS+RK5r7T42PQ==3O3WWMPRtQzW3tCX' },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        const totalRow = calculateTotalRow(data.items || []);
        setNutritionData([totalRow, ...(data.items || [])]); // Add "Total" row at the top
      })
      .catch((error) => console.error('Error fetching nutrition data:', error))
      .finally(() => setLoadingNutrition(false));
  };

  const calculateTotalRow = (items) => {
    const total = {
      name: 'Total',
      serving_size_g: items.reduce(
        (sum, item) => sum + (item.serving_size_g || 0),
        0
      ),
      calories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
      fat_total_g: items.reduce(
        (sum, item) => sum + (item.fat_total_g || 0),
        0
      ),
      fat_saturated_g: items.reduce(
        (sum, item) => sum + (item.fat_saturated_g || 0),
        0
      ),
      cholesterol_mg: items.reduce(
        (sum, item) => sum + (item.cholesterol_mg || 0),
        0
      ),
      sodium_mg: items.reduce((sum, item) => sum + (item.sodium_mg || 0), 0),
      carbohydrates_total_g: items.reduce(
        (sum, item) => sum + (item.carbohydrates_total_g || 0),
        0
      ),
      fiber_g: items.reduce((sum, item) => sum + (item.fiber_g || 0), 0),
      sugar_g: items.reduce((sum, item) => sum + (item.sugar_g || 0), 0),
      protein_g: items.reduce((sum, item) => sum + (item.protein_g || 0), 0),
    };

    // Round all numeric values to one decimal place
    Object.keys(total).forEach((key) => {
      if (typeof total[key] === 'number') {
        total[key] = total[key].toFixed(1); // Round to 1 decimal place
      }
    });

    return total;
  };

  const roundToDecimal = (value) =>
    value ? parseFloat(value).toFixed(1) : '-';

  // Open rating modal
  const openRatingModal = () => {
    setRatingModalVisible(true);
    setMealDetailsModalVisible(false); // Close meal details modal
  };

  // Handle saving the rating
  const handleSaveRating = async () => {
    if (mealDetails && mealSpecificRating > 0) {
      try {
        const ratingsDocRef = firebase
          .firestore()
          .collection('Ratings')
          .doc(mealDetails.idMeal);

        await ratingsDocRef.set(
          {
            ratings: {
              [mealSpecificRating]: firebase.firestore.FieldValue.increment(1),
            },
          },
          { merge: true }
        );

        const updatedRatings = await fetchRatings(mealDetails.idMeal);
        const { averageRating, percentages, totalVotes } =
          calculateRatingsData(updatedRatings);

        setAverageRatings((prev) => ({
          ...prev,
          [mealDetails.idMeal]: {
            averageRating,
            percentages,
            totalVotes,
          },
        }));

        alert(`Your ${mealSpecificRating}-star rating has been saved!`);
      } catch (error) {
        console.error('Error saving rating:', error);
        alert('Failed to save rating. Please try again.');
      }

      setMealSpecificRating(0);
      setRatingModalVisible(false);
      setMealDetailsModalVisible(true);
    } else {
      alert('Please select a rating before saving.');
    }
  };

  // Close rating modal
  const handleCloseRatingModal = () => {
    setMealSpecificRating(0);
    setRatingModalVisible(false);
    setMealDetailsModalVisible(true);
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppBackground.jpeg?alt=media&token=ff5e6fc2-e72f-4d8c-a469-633d4b8430bd',
      }}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}>
      <View style={styles.container}>
        {/* Profile Icon */}
        <SafeAreaView
          style={{
            width: width,
            backgroundColor: 'transparent',
            height: height * 0.12,
            marginBottom: height * 0.015,
          }}>
          <TouchableOpacity
            style={styles.profileIconContainer}
            onPress={() => navigateToPage('Profile')}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : (
              <Image
                source={{
                  uri: profilePhoto,
                }}
                style={styles.profileIcon}
              />
            )}
            <Text style={styles.circleProfileText}>
              {username || 'Loading...'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Main Grid of Circles */}
          <View style={styles.gridContainer}>
            <View style={styles.iconsRow}>
              {/* All Meals */}
              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => navigateToPage('Recipes')}>
                <Image
                  source={{
                    uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AllMealsIcon.jpg?alt=media&token=294d805f-1d9a-40ae-854c-a69758e82d14',
                  }}
                  style={styles.iconImage}
                />
                <Text style={styles.iconText}>All Meals</Text>
              </TouchableOpacity>

              {/* By Ingredients */}
              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => setModalVisible(true)}>
                <Image
                  source={{
                    uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/ByIngredientsIcon.jpeg?alt=media&token=713ec7d2-e32b-496c-ad75-9c554e130992',
                  }}
                  style={styles.iconImage}
                />
                <Text style={styles.iconText}>By Ingredients</Text>
              </TouchableOpacity>

              {/* By Calories */}
              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => setCaloriesModalVisible(true)}>
                <Image
                  source={{
                    uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/ByCaloriesIcon.jpg?alt=media&token=5d2b3689-6d44-4102-ab7b-2c144ad45d64',
                  }}
                  style={styles.iconImage}
                />
                <Text style={styles.iconText}>By Calories</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => navigateToPage('UsersMeals')}>
                <Image
                  source={{
                    uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/UsersMealsIcon.jpg?alt=media&token=c402b289-e3b1-460c-ac68-6a0ac23e33c1',
                  }}
                  style={styles.iconImage}
                />
                <Text style={styles.iconText}>User's Meals</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal for displaying ingredients */}
          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContentEnhanced}>
                {/* Search Bar */}
                <TextInput
                  style={styles.searchBarEnhanced}
                  placeholder="Search ingredient"
                  value={searchTerm}
                  onChangeText={(text) => setSearchTerm(text)}
                />

                {/* Selected Ingredients */}
                {selectedIngredients.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle2}>Selected</Text>
                    <FlatList
                      ref={selectedIngredientsListRef}
                      data={selectedIngredientsOrder
                        .map((id) =>
                          ingredients.find((item) => item.idIngredient === id)
                        )
                        .filter(Boolean)} // Filter out any undefined values
                      keyExtractor={(item) => item.idIngredient}
                      horizontal
                      renderItem={({ item }) => (
                        <View style={styles.selectedIngredient}>
                          <Image
                            source={{
                              uri: `https://www.themealdb.com/images/ingredients/${item.strIngredient}.png`,
                            }}
                            style={styles.ingredientImage}
                          />
                          <Text style={styles.ingredientText}>
                            {item.strIngredient}
                          </Text>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() =>
                              toggleIngredientSelection(item.idIngredient)
                            }>
                            <Text style={styles.removeButtonText}>✖</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>
                )}
                {/* Popular Ingredients */}
                <Text style={styles.sectionTitle2}>All Ingredients</Text>
                <FlatList
                  data={ingredients.filter((item) =>
                    item.strIngredient
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )}
                  keyExtractor={(item) => item.idIngredient}
                  numColumns={3}
                  columnWrapperStyle={styles.ingredientRow}
                  renderItem={({ item }) => {
                    const isSelected = selectedIngredients.includes(
                      item.idIngredient
                    );
                    return (
                      <TouchableOpacity
                        style={[
                          styles.popularIngredient,
                          isSelected && styles.disabledIngredient,
                        ]}
                        onPress={() =>
                          !isSelected &&
                          toggleIngredientSelection(item.idIngredient)
                        }
                        disabled={isSelected} // Disable button if ingredient is selected
                      >
                        <Image
                          source={{
                            uri: `https://www.themealdb.com/images/ingredients/${item.strIngredient}.png`,
                          }}
                          style={styles.ingredientImage}
                          onLoad={() =>
                            setLoadedImages((prev) => ({
                              ...prev,
                              [item.strIngredient]: true,
                            }))
                          }
                          defaultSource={
                            loadedImages[item.strIngredient]
                              ? {
                                  uri: `https://www.themealdb.com/images/ingredients/${item.strIngredient}.png`,
                                }
                              : null
                          }
                        />
                        <Text style={styles.ingredientText}>
                          {item.strIngredient}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />

                <View style={styles.buttonRow}>
                  <Button
                    title="Find Meals"
                    onPress={handleNavigateToRecipes}
                  />
                  <Button title="Close" onPress={handleCloseModal} />
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal for selecting calorie ranges */}
          <Modal
            visible={isCaloriesModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setCaloriesModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Calorie Range</Text>

                {/* Calorie range options */}
                <FlatList
                  data={calorieOptions}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.calorieOption,
                        selectedCalories[0] === item &&
                          styles.calorieOptionSelected,
                      ]}
                      onPress={() => setSelectedCalories([item])} // Single selection
                    >
                      <Text
                        style={[
                          styles.calorieOptionText,
                          selectedCalories[0] === item &&
                            styles.calorieOptionTextSelected,
                        ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {/* Buttons Row */}
                <View style={styles.buttonRow}>
                  <Button title="Find Meals" onPress={fetchMealsByCalories} />
                  <Button title="Close" onPress={handleCloseCaloriesModal} />
                </View>
              </View>
            </View>
          </Modal>

          {/* Dish of the Day Section */}
          {dishOfTheDay && (
            <View style={styles.dishContainer}>
              <Text style={styles.sectionTitle}>Dish of the Day</Text>
              <TouchableOpacity
                style={styles.mealItem}
                onPress={() => fetchMealDetails(dishOfTheDay.idMeal)}>
                {/* Meal Image */}
                <Image
                  source={{ uri: dishOfTheDay.strMealThumb }}
                  style={styles.mealImage}
                />

                {/* White Box with Meal Name */}
                <View style={styles.mealFooter}>
                  <Text style={styles.mealName}>{dishOfTheDay.strMeal}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Find Meals Modal */}
          <Modal
            visible={isFindMealsModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setFindMealsModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContentEnhanced}>
                <Text style={styles.modalTitle}>
                  Meals with Selected Ingredients
                </Text>

                {fetchingMeals ? (
                  <ActivityIndicator size="large" color="#007AFF" />
                ) : filteredMeals.length > 0 ? (
                  <FlatList
                    data={filteredMeals}
                    keyExtractor={(item) => item.idMeal}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.mealItem}
                        onPress={() => fetchMealDetails(item.idMeal)}>
                        <Image
                          source={{ uri: item.strMealThumb }}
                          style={styles.mealImage}
                        />
                        <Text style={styles.mealName}>{item.strMeal}</Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <Text>No meals found with the selected ingredients.</Text>
                )}

                <View style={styles.buttonRow}>
                  <Button
                    title="Find Meals"
                    onPress={fetchMealsByIngredients}
                  />
                  <Button
                    title="Close"
                    onPress={() => setFindMealsModalVisible(false)}
                  />
                </View>
              </View>
            </View>
          </Modal>
          {/* Occasion Sections */}
          {occasions.map((occasion) => (
            <View key={occasion.name} style={styles.occasionSection}>
              <Text style={styles.occasionTitle}>{occasion.name}</Text>
              <FlatList
                data={occasionMeals[occasion.name]}
                keyExtractor={(item) => item.idMeal}
                horizontal
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mealItem}
                    onPress={() => fetchMealDetails(item.idMeal)}>
                    {/* Meal Image */}
                    <Image
                      source={{ uri: item.strMealThumb }}
                      style={styles.mealImage}
                    />

                    {/* White Box with Meal Name */}
                    <View style={styles.mealFooter}>
                      <Text style={styles.mealName}>{item.strMeal}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          ))}
        </ScrollView>
        {/* Meal Details Modal */}
        <Modal
          visible={mealDetailsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setMealDetailsModalVisible(false)}>
          <View style={styles.modalContainer1}>
            <View style={styles.modalContent1}>
              {loadingMealDetails ? (
                <ActivityIndicator size="large" color="#0000ff" />
              ) : mealDetails ? (
                <>
                  <ScrollView
                    style={styles.detailsScroll}
                    nestedScrollEnabled={true}>
                    <Text style={styles.mealDetailTitle}>
                      {mealDetails.strMeal}
                    </Text>
                    <Image
                      source={{ uri: mealDetails.strMealThumb }}
                      style={styles.mealDetailImage}
                    />
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => openRatingModal()}>
                      <Text style={styles.rateButtonText}>Rate this Meal</Text>
                    </TouchableOpacity>
                    {loadingNutrition ? (
                      <ActivityIndicator size="large" color="#0000ff" />
                    ) : nutritionData && nutritionData.length > 0 ? (
                      <ScrollView
                        style={styles.nutritionTableScroll}
                        horizontal>
                        <ScrollView style={styles.nutritionTableVerticalScroll}>
                          <View style={styles.table}>
                            {/* Header */}
                            <View style={[styles.tableRow, styles.tableHeader]}>
                              {[
                                'Name',
                                'Serving Size',
                                'Calories',
                                'Total Fat',
                                'Saturated Fat',
                                'Cholesterol',
                                'Sodium',
                                'Carbohydrates',
                                'Fiber',
                                'Sugar',
                                'Protein',
                              ].map((header, index) => (
                                <Text key={index} style={[styles.headerCell]}>
                                  {header}
                                </Text>
                              ))}
                            </View>

                            {/* Nutrition Rows */}
                            {nutritionData.map((item, index) => (
                              <View
                                key={index}
                                style={[
                                  styles.tableRow,
                                  item.name === 'Total' && styles.totalRow, // Apply additional style for Total row
                                ]}>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText, // Apply additional style for Total text
                                  ]}>
                                  {item.name || '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.serving_size_g
                                    ? `${roundToDecimal(item.serving_size_g)}g`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.calories
                                    ? roundToDecimal(item.calories)
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.fat_total_g
                                    ? `${roundToDecimal(item.fat_total_g)}g`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.fat_saturated_g
                                    ? `${roundToDecimal(item.fat_saturated_g)}g`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.cholesterol_mg
                                    ? `${roundToDecimal(item.cholesterol_mg)}mg`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.sodium_mg
                                    ? `${roundToDecimal(item.sodium_mg)}mg`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.carbohydrates_total_g
                                    ? `${roundToDecimal(
                                        item.carbohydrates_total_g
                                      )}g`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.fiber_g
                                    ? `${roundToDecimal(item.fiber_g)}g`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.sugar_g
                                    ? `${roundToDecimal(item.sugar_g)}g`
                                    : '-'}
                                </Text>
                                <Text
                                  style={[
                                    styles.cell,
                                    item.name === 'Total' &&
                                      styles.totalCellText,
                                  ]}>
                                  {item.protein_g
                                    ? `${roundToDecimal(item.protein_g)}g`
                                    : '-'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </ScrollView>
                    ) : (
                      <Text>No nutrition data available.</Text>
                    )}
                    {/* Instructions Section */}
                    <Text style={styles.sectionTitle1}>Method</Text>
                    <View style={styles.instructionsContainer}>
                      {mealDetails.strInstructions
                        .replace(/\b(STEP\s*\d+|\d+(\)|\.|-))\b/g, '')
                        .split('. ') // Split instructions into steps
                        .map((instruction, index) => {
                          if (instruction.trim() === '') return null;
                          return (
                            <View key={index} style={styles.instructionItem}>
                              {/* Step Number */}
                              <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>
                                  {index + 1}
                                </Text>
                              </View>
                              {/* Instruction Text */}
                              <View style={styles.instructionContent}>
                                <Text style={styles.instructionText}>
                                  {instruction.trim()}.
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>

                    {/* Ingredients Section */}
                    <Text style={styles.sectionTitle1}>Ingredients</Text>
                    <View style={styles.ingredientsContainer}>
                      {Array.from({ length: 20 }).map((_, index) => {
                        const ingredient =
                          mealDetails[`strIngredient${index + 1}`];
                        const measure = mealDetails[`strMeasure${index + 1}`];
                        const ingredientImage = `https://www.themealdb.com/images/ingredients/${ingredient}.png`;

                        return ingredient ? (
                          <View key={index} style={styles.ingredientItem}>
                            {/* Ingredient Image */}
                            <Image
                              source={{ uri: ingredientImage }}
                              style={styles.ingredientImage}
                              resizeMode="contain"
                            />
                            {/* Measurement and Ingredient Name */}
                            <Text style={styles.ingredientText}>
                              <Text style={styles.ingredientMeasure}>
                                {measure}{' '}
                              </Text>
                              {ingredient}
                            </Text>
                          </View>
                        ) : null;
                      })}
                    </View>

                    {/* YouTube Video Link */}
                    {mealDetails.strYoutube && (
                      <View style={styles.videoContainer}>
                        <Text style={styles.sectionTitle1}>Video Tutorial</Text>
                        <TouchableOpacity
                          onPress={() =>
                            Linking.openURL(mealDetails.strYoutube)
                          }>
                          <Text style={styles.youtubeLink}>
                            Watch on YouTube
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                  {/* Close Button */}
                  <View style={styles.fixedCloseButtonContainer}>
                    <Button
                      title="Close"
                      onPress={() => setMealDetailsModalVisible(false)}
                    />
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal
          visible={ratingModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseRatingModal}>
          <View style={styles.ratingModalContainer}>
            <View style={styles.ratingModalContent}>
              <Text style={styles.modalTitle}>Rate this Meal</Text>
              <View style={styles.starsContainer}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setMealSpecificRating(index + 1)}>
                    <FontAwesome
                      name={mealSpecificRating > index ? 'star' : 'star-o'}
                      size={32}
                      color={mealSpecificRating > index ? '#FFD700' : '#ccc'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={[styles.ratingButton, styles.saveButton]}
                  onPress={handleSaveRating}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ratingButton, styles.closeButton]}
                  onPress={handleCloseRatingModal}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
};

export default Main;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },

  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    marginTop: 25,
    paddingTop: 20,
  },
  profileIconContainer: {
    position: 'absolute',
    // top: height * 0.03,
    right: width * 0.05,
    marginTop: height * 0.02,
    zIndex: 1000,
  },
  profileIcon: {
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: (width * 0.15) / 2,
    backgroundColor: '#E5E5E5',
  },
  circleProfileText: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridContainer: {
    position: 'absolute',
    top: height * 0.01, // Adjusted to reduce the space
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingBottom: 10,
    paddingTop: 10,
    zIndex: 1000, // Ensures the grid stays above scrollable content
  },

  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width,
  },
  iconContainer: {
    alignItems: 'center',
    flex: 1,
  },
  iconImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
  },
  iconText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '70%',
  },
  dishContainer: {
    marginTop: height * 0.2,
    alignItems: 'center',
    width: '100%',
    zIndex: -1, // Ensure dish container doesn't overlap other components
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: '#d67c7c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  dishImage: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: 10,
  },
  dishName: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 100,
    paddingBottom: 50,
  },
  modalContent1: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%', // Limits the maximum height of the modal content
    justifyContent: 'space-between', // Space between scrollable content and fixed button
  },
  fixedCloseButtonContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff', // Ensure the button area has a background
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  mealDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  mealDetailImage: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: 'center', // Centers the image
  },
  sectionTitle1: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  detailsScroll: {
    flexGrow: 0, // Allow scrollable content to be independent
    marginBottom: 30, // Add space at the bottom of scrollable content
  },

  searchBarEnhanced: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },

  sectionTitle2: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
  },

  ingredientRow: {
    justifyContent: 'space-between',
  },

  popularIngredient: {
    alignItems: 'center',
    margin: 10,
    width: 70,
  },
  selectedIngredient: {
    alignItems: 'center',
    margin: 5, // Spacing between items
    width: 80, // Fixed width to control layout
  },
  removeButton: {
    position: 'absolute',
    right: -5,
    backgroundColor: '#ff4d4d',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeButtonText: {
    color: 'white',
    fontSize: 14,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  disabledIngredient: {
    opacity: 0.5, // Reduce opacity to indicate disabled state
  },
  occasionSection: {
    marginTop: height * 0.05,
    paddingHorizontal: 15,
  },
  occasionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  mealItem: {
    marginHorizontal: 10, // Space between meal items
    marginBottom: 20, // Space below each meal item
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center', // Center the content
    width: 150, // Fixed width for all meal items
    elevation: 3, // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mealImage: {
    width: '100%', // Full width of the card
    height: 100, // Fixed height for consistent image size
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  mealFooter: {
    backgroundColor: 'white',
    paddingVertical: 5,
    paddingHorizontal: 10, // Added padding to avoid text touching edges
    width: '100%', // Full width of the card
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    flexWrap: 'wrap', // Allows the text to wrap to the next line
    maxWidth: '100%', // Ensures the text doesn't exceed the card's width
    lineHeight: 18, // Better readability for multiline text
  },
  loadingContainer: {
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: (width * 0.15) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
  },
  findMealsButton: {
    marginTop: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#1e90ff',
    borderRadius: 10,
    alignSelf: 'center',
  },
  findMealsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentEnhanced: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  // Rating Modal Styles
  ratingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
  },
  ratingModalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  ratingButton: {
    flex: 1, // Equal width for buttons
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50', // Save button background color (green)
  },
  closeButton: {
    backgroundColor: '#FF6347', // Close button background color (red)
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Instructions Section Styles
  instructionsContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20, // Spacing between each instruction
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6347', // Circle color
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructionContent: {
    flex: 1, // Allows the text to wrap properly
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24, // Improves readability with spacing between lines
    color: '#333', // Text color
  },

  // Ingredients Section Styles
  ingredientsContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientImage: {
    width: 40, // Adjust the size of the image
    height: 40,
    marginRight: 10,
    borderRadius: 5, // Optional: Add a slight rounding for aesthetics
  },
  ingredientText: {
    fontSize: 16,
    color: '#333',
    flexShrink: 1, // Prevents text from overflowing
  },
  ingredientMeasure: {
    fontWeight: 'bold',
    color: '#FF6347', // Use any color for emphasis
  },

  // Video Section Styles
  videoContainer: {
    marginTop: 20,
  },
  youtubeLink: {
    fontSize: 18,
    color: 'blue',
    textAlign: 'left',
    textDecorationLine: 'underline',
  },
  rateButton: {
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    alignSelf: 'center',
  },
  rateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nutritionTableScroll: {
    maxHeight: 200, // Height to make the table vertically scrollable
  },
  nutritionTableVerticalScroll: {
    marginBottom: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  tableHeader: {
    backgroundColor: '#333',
  },
  headerCell: {
    width: 110, // Fixed width for each column
    padding: 8,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cell: {
    width: 110, // Same fixed width as header cells
    padding: 8,
    textAlign: 'left',
    color: '#333',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  totalRow: {
    backgroundColor: '#f0eded',
  },
  totalCellText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  calorieOption: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieOptionSelected: {
    backgroundColor: '#d67c7c',
    borderColor: '#d67c7c',
  },
  calorieOptionText: {
    fontSize: 16,
    color: '#333',
  },
  calorieOptionTextSelected: {
    color: 'black',
    fontWeight: 'bold',
  },
});
