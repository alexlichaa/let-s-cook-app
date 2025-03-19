import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Button,
  Dimensions,
  Linking,
  ImageBackground,
} from 'react-native';
import firebase from 'firebase';
import MealDetailsModal from './MealDetailsModal';

const FilteredMeals = ({ route, navigation }) => {
  const { selectedIngredientNames } = route.params;
  const [meals, setMeals] = useState([]);
  //const [mealDetails, setMealDetails] = useState(null);
  const [loadingMeals, setLoadingMeals] = useState(false);
  //const [loadingMealDetails, setLoadingMealDetails] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const [currentMealID, setCurrentMealID] = useState(null);
  const [averageRatings, setAverageRatings] = useState({});

  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const dimensionSubscription = Dimensions.addEventListener(
      'change',
      updateScreenWidth
    );

    return () => {
      dimensionSubscription?.remove();
    };
  }, []);

  const itemWidth = screenWidth / 2 - 30;

  useEffect(() => {
    const fetchMealsByIngredients = async () => {
      setLoadingMeals(true);
      try {
        let mealsWithMatchingIngredients = [];

        for (const ingredientName of selectedIngredientNames) {
          const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredientName}`
          );
          const data = await response.json();
          if (data.meals) {
            mealsWithMatchingIngredients = [
              ...mealsWithMatchingIngredients,
              ...data.meals,
            ];
          }
        }

        const uniqueMealIds = [
          ...new Set(mealsWithMatchingIngredients.map((meal) => meal.idMeal)),
        ];
        const detailedMeals = [];

        for (const mealId of uniqueMealIds) {
          const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
          );
          const data = await response.json();
          if (data.meals) {
            const mealDetails = data.meals[0];
            const mealIngredients = Array.from({ length: 20 })
              .map((_, index) =>
                mealDetails[`strIngredient${index + 1}`]?.toLowerCase()
              )
              .filter(Boolean);

            if (
              mealIngredients.some((ingredient) =>
                selectedIngredientNames.includes(ingredient)
              )
            ) {
              detailedMeals.push(mealDetails);
            }
          }
        }

        setMeals(detailedMeals);
      } catch (error) {
        console.error('Error fetching meals:', error);
      } finally {
        setLoadingMeals(false);
      }
    };

    if (selectedIngredientNames.length > 0) {
      fetchMealsByIngredients();
    }
  }, [selectedIngredientNames]);

  // const fetchMealDetails = (mealID) => {
  //   setLoadingMealDetails(true);
  //   fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`)
  //     .then((response) => response.json())
  //     .then((data) => {
  //       setMealDetails(data.meals[0]);
  //       setLoadingMealDetails(false);
  //       setModalVisible(true);
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching meal details:', error);
  //       setLoadingMealDetails(false);
  //     });
  // };

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

  useEffect(() => {
    const fetchAllRatings = async () => {
      const ratingsPromises = meals.map(async (meal) => {
        const ratings = await fetchRatings(meal.idMeal); // Fetch ratings from Firestore
        const { averageRating, percentages, totalVotes } =
          calculateRatingsData(ratings);

        // Store the calculated ratings in state
        setAverageRatings((prev) => ({
          ...prev,
          [meal.idMeal]: {
            averageRating,
            percentages,
            totalVotes,
          },
        }));
      });

      await Promise.all(ratingsPromises);
    };

    if (meals.length > 0) {
      fetchAllRatings(); // Fetch ratings when meals are loaded
    }
  }, [meals]);

  const handleBackPress = () => {
    navigation.navigate('Main');
  };

  if (loadingMeals) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppBackground.jpeg?alt=media&token=ff5e6fc2-e72f-4d8c-a469-633d4b8430bd',
      }}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {meals.length > 0 ? (
            <View style={styles.mealsContainer}>
              <FlatList
                data={meals}
                keyExtractor={(item) => item.idMeal}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mealItem}
                    onPress={() => {
                      setCurrentMealID(item.idMeal);
                      setModalVisible(true);
                    }}>
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
                numColumns={2} // Keep the 2-column layout
                scrollEnabled={false}
              />
            </View>
          ) : (
            <Text style={styles.noMealsText}>
              No meals found for the selected ingredients.
            </Text>
          )}
        </ScrollView>
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

export default FilteredMeals;

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
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    color: 'black',
    fontSize: 20,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  mealsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  mealItem: {
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ffffff', // White background for each meal item
  borderRadius: 10, // Rounded corners
  margin: 10, // Spacing between items
  shadowColor: '#000', // Optional: Add shadow for a card effect
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 3, // Shadow for Android
  width: 160, // Fixed width for stability
},

mealImage: {
  width: '100%',
  height: 120,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  resizeMode: 'cover', // Crop image to fill the space
},

mealFooter: {
  padding: 10,
  backgroundColor: '#ffffff', // White box below the image
  borderBottomLeftRadius: 10,
  borderBottomRightRadius: 10,
  width: '100%', // Full width of the card
  alignItems: 'center', // Center the text
},

mealName: {
  fontSize: 14,
  fontWeight: 'bold',
  textAlign: 'center',
  color: '#333',
  lineHeight: 18, // Adjust spacing for readability
},
 
  noMealsText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
});
