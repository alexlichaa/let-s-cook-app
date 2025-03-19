// FilterByCalories.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  Dimensions,
  Modal,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import MealDetailsModal from './MealDetailsModal'; // Ensure this component is available

// Utility function to control concurrency (unchanged)
const asyncPool = async (poolLimit, array, iteratorFn) => {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
};

const FilterByCalories = ({ route, navigation }) => {
  const { selectedCalories } = route.params;
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMealID, setCurrentMealID] = useState(null);
  const [averageRatings, setAverageRatings] = useState({});

  const getCalorieRange = (calorieOption) => {
    if (calorieOption.includes('<'))
      return [
        0,
        parseInt(calorieOption.replace('<', '').replace('kcal', '').trim()),
      ];
    if (calorieOption.includes('>'))
      return [
        parseInt(calorieOption.replace('>', '').replace('kcal', '').trim()),
        Infinity,
      ];
    const [min, max] = calorieOption
      .split('-')
      .map((str) => parseInt(str.replace('kcal', '').trim()));
    return [min, max];
  };

  const [minCalories, maxCalories] = getCalorieRange(selectedCalories);

  const fetchAllCategories = async () => {
    const response = await fetch(
      'https://www.themealdb.com/api/json/v1/1/categories.php'
    );
    const data = await response.json();
    return data.categories ? data.categories.map((cat) => cat.strCategory) : [];
  };

  const fetchMealsByCategory = async (category) => {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(
        category
      )}`
    );
    const data = await response.json();
    return data.meals ? data.meals : [];
  };

  // Fetch meal details
  const fetchMealDetails = async (mealId) => {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
    );
    const data = await response.json();
    return data.meals ? data.meals[0] : null;
  };

  // Fetch nutrition data
  const fetchNutritionData = async (ingredients) => {
    const response = await fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
        ingredients
      )}`,
      {
        headers: { 'X-Api-Key': 'P3KS2zRUAhS+RK5r7T42PQ==3O3WWMPRtQzW3tCX' },
      }
    );
    const data = await response.json();
    return data.items ? data.items : [];
  };

  // Main function to fetch and filter meals
  const fetchMealsByCalories = async () => {
    setLoading(true);
    try {
      const categories = await fetchAllCategories();
      if (categories.length === 0) {
        setFilteredMeals([]);
        return;
      }

      // Fetch all meals across all categories with controlled concurrency
      const allMeals = await asyncPool(
        5,
        categories,
        fetchMealsByCategory
      ).then((results) => results.flat());

      // Remove duplicate meals (if any)
      const uniqueMealsMap = new Map();
      allMeals.forEach((meal) => {
        if (!uniqueMealsMap.has(meal.idMeal)) {
          uniqueMealsMap.set(meal.idMeal, meal);
        }
      });
      const uniqueMeals = Array.from(uniqueMealsMap.values());

      // Fetch meal details and calculate calories with controlled concurrency
      const mealsWithCalories = await asyncPool(
        5,
        uniqueMeals,
        async (meal) => {
          const details = await fetchMealDetails(meal.idMeal);
          if (!details) return null;

          const ingredients = Array.from({ length: 20 })
            .map((_, index) => {
              const ingredient = details[`strIngredient${index + 1}`];
              const measure = details[`strMeasure${index + 1}`];
              return ingredient && measure ? `${measure} ${ingredient}` : null;
            })
            .filter(Boolean)
            .join(', ');

          if (!ingredients) return null;

          const nutritionItems = await fetchNutritionData(ingredients);
          const totalCalories = nutritionItems.reduce(
            (sum, item) => sum + (item.calories || 0),
            0
          );

          if (totalCalories >= minCalories && totalCalories <= maxCalories) {
            return { ...meal, totalCalories };
          }
          return null;
        }
      );

      // Filter out null values
      const validMeals = mealsWithCalories.filter(Boolean);
      setFilteredMeals(validMeals);
    } catch (error) {
      console.error('Error fetching meals by calories:', error);
      setFilteredMeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealsByCalories();
  }, []);

  // Handle screen width changes for responsive design
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );

  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    // Add event listener for screen changes
    const dimensionSubscription = Dimensions.addEventListener(
      'change',
      updateScreenWidth
    );

    return () => {
      // Cleanup event listener on component unmount
      dimensionSubscription?.remove();
    };
  }, []);

  const itemWidth = (screenWidth - 40) / 2; // Calculate item width based on current screen width

  // Handle back navigation
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Handle scroll events to show/hide scroll to top button
  const scrollViewRef = useRef(null);
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y; // Get scroll position
    setIsScrollTopVisible(offsetY > 200); // Show button if scrolled 200px
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

    // Initialize percentages for all stars to 0
    const percentages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // Calculate percentages for stars that have votes
    for (const [star, count] of Object.entries(ratings)) {
      percentages[star] = Math.round((count / totalVotes) * 100);
    }

    // Handle no ratings scenario
    if (totalVotes === 0) {
      return {
        totalVotes: 0,
        percentages, // All percentages remain 0
        averageRating: 'Not rated yet',
      };
    }

    const averageRating =
      Object.entries(ratings).reduce(
        (sum, [star, count]) => sum + star * count,
        0
      ) / totalVotes;

    return {
      totalVotes,
      percentages,
      averageRating: averageRating.toFixed(2),
    };
  };

  // Render individual meal item
  const renderMeal = ({ item }) => (
    <TouchableOpacity
      style={[styles.mealItem, { width: itemWidth }]}
      onPress={() => {
        setCurrentMealID(item.idMeal);
        setModalVisible(true);
      }}>
      <Image source={{ uri: item.strMealThumb }} style={styles.mealImage} />
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{item.strMeal}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppBackground.jpeg?alt=media&token=ff5e6fc2-e72f-4d8c-a469-633d4b8430bd',
      }}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}>
      <SafeAreaView style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll} // Listen to scroll events
          scrollEventThrottle={16} // Throttle for better performance
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Filtered Meals</Text>
            <Text style={styles.subtitle}>
              Calories between {minCalories} kcal and{' '}
              {maxCalories === Infinity ? '∞' : maxCalories} kcal
            </Text>
          </View>

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : filteredMeals.length > 0 ? (
            <FlatList
              data={filteredMeals}
              keyExtractor={(item) => item.idMeal}
              renderItem={renderMeal}
              numColumns={2} // Two columns layout
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.mealsList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noMealsText}>
              No meals found in the selected calorie range.
            </Text>
          )}
        </ScrollView>

        {/* Scroll to Top Button */}
        {isScrollTopVisible && (
          <TouchableOpacity
            style={styles.scrollToTopButton}
            onPress={scrollToTop}>
            <Text style={styles.scrollToTopText}>↑</Text>
          </TouchableOpacity>
        )}

        <MealDetailsModal
          mealID={currentMealID}
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          averageRatings={averageRatings}
          setAverageRatings={setAverageRatings}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

export default FilterByCalories;

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    paddingTop: 20,
  },
  backButton: {
    left: 15,
    marginBottom: 10,
  },
  backButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealsList: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  mealItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 1 }, // For iOS shadow
    shadowOpacity: 0.3, // For iOS shadow
    shadowRadius: 2, // For iOS shadow
  },
  mealImage: {
    width: '100%',
    height: 150,
  },
  mealInfo: {
    padding: 10,
    alignItems: 'center',
  },
  mealName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  caloriesText: {
    fontSize: 14,
    color: '#555',
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'black',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  scrollToTopText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  noMealsText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
