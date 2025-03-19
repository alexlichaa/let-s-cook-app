import React, { useEffect, useState, useRef } from 'react';
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
  Dimensions, // To calculate screen width
  Linking,
  ImageBackground,
  TextInput,
} from 'react-native';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import MealDetailsModal from './MealDetailsModal';

const RecipesData = ({ navigation }) => {
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollViewRef = useRef(null); // Ref for ScrollView
  const [isScrollTopVisible, setIsScrollTopVisible] = useState(false); // State for button visibility
  const [categories, setCategories] = useState([]);
  const [meals, setMeals] = useState([]);
  const [likedMeals, setLikedMeals] = useState({});
  //const [mealRatings, setMealRatings] = useState({});
  //const [mealDetails, setMealDetails] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(false);
  //const [loadingMealDetails, setLoadingMealDetails] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // To handle meal details modal
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  // const [ratingModalVisible, setRatingModalVisible] = useState(false); // To handle rating modal visibility
  // const [mealSpecificRating, setMealSpecificRating] = useState(0); // To store the selected rating for a specific meal
  // const [nutritionData, setNutritionData] = useState(null); // State to store nutrition facts
  // const [loadingNutrition, setLoadingNutrition] = useState(false); // Loading state for nutrition API
  const [averageRatings, setAverageRatings] = useState({});
  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [currentMealRatings, setCurrentMealRatings] = useState({
    totalVotes: 0,
    percentages: {},
    averageRating: 0,
  });
  const [currentMealID, setCurrentMealID] = useState(null);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  ); // Initialize screen width state

  useEffect(() => {
    // Update item width when screen size changes
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

  const itemWidth = screenWidth / 2 - 30; // Calculate item width based on current screen width

  // Fetch meal categories
  useEffect(() => {
    fetch('https://www.themealdb.com/api/json/v1/1/categories.php')
      .then((response) => response.json())
      .then((data) => {
        setCategories(data.categories);
        setLoadingCategories(false);
      })
      .catch((error) => {
        console.error('Error fetching categories:', error);
        setLoadingCategories(false);
      });
    // Fetch meals for the 'Beef' category by default
    fetchMealsByCategory('Beef');
  }, []);

  // Fetch meals by category
  const fetchMealsByCategory = (category) => {
    setSelectedCategoryName(category); // Set the selected category name
    setSearchTerm(''); // Reset the search term when switching categories
    setLoadingMeals(true);
    setMeals([]); // Clear existing meals when switching categories
    fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`)
      .then((response) => response.json())
      .then((data) => {
        setMeals(data.meals);
        setLoadingMeals(false);
      })
      .catch((error) => {
        console.error('Error fetching meals:', error);
        setLoadingMeals(false);
      });
  };

  const filteredMeals = meals.filter((meal) =>
    meal.strMeal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // const mealDetailsCache = {}; // Cache object for meal details

  // const fetchMealDetails = (mealID) => {
  //   if (mealDetailsCache[mealID]) {
  //     setMealDetails(mealDetailsCache[mealID]); // Load from cache
  //     setModalVisible(true);
  //     return;
  //   }

  //   setModalVisible(true);
  //   setLoadingMealDetails(true);

  //   fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`)
  //     .then((response) => response.json())
  //     .then((data) => {
  //       const mealDetail = data.meals[0];
  //       mealDetailsCache[mealID] = mealDetail; // Store in cache
  //       setMealDetails(mealDetail);
  //       fetchNutritionData(mealDetail);
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching meal details:', error);
  //     })
  //     .finally(() => {
  //       setLoadingMealDetails(false);
  //     });
  // };

  useEffect(() => {
    // Fetch user's existing favorites from Firestore
    const fetchFavorites = async () => {
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
            const favorites = userData.favorites || [];
            const initialLikes = {};
            favorites.forEach((mealID) => {
              initialLikes[mealID] = true;
            });
            setLikedMeals(initialLikes);
          }
        } catch (error) {
          console.error('Error fetching user favorites:', error);
        } finally {
          setLoadingFavorites(false);
        }
      }
    };

    fetchFavorites();
  }, []);

  const toggleLike = async (mealID) => {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const userDocRef = firebase
      .firestore()
      .collection('USERSinfo')
      .doc(user.uid);

    try {
      if (likedMeals[mealID]) {
        // If already liked, remove from favorites
        await userDocRef.update({
          favorites: firebase.firestore.FieldValue.arrayRemove(mealID),
        });
        setLikedMeals((prevLikes) => ({
          ...prevLikes,
          [mealID]: false,
        }));
      } else {
        // If not liked, add to favorites
        await userDocRef.update({
          favorites: firebase.firestore.FieldValue.arrayUnion(mealID),
        });
        setLikedMeals((prevLikes) => ({
          ...prevLikes,
          [mealID]: true,
        }));
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

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

  if (loadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  const handleBackPress = () => {
    navigation.navigate('Main');
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y; // Get scroll position
    setIsScrollTopVisible(offsetY > 200); // Show button if scrolled 200px
  };
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // const openRatingModal = async () => {
  //   setModalVisible(false);
  //   console.log('MODAL INITIAL IS ', modalVisible);
  //   console.log('OPENING MODAL FUNC');
  //   setRatingModalVisible(true);
  // };

  // const fetchNutritionData = (mealDetail) => {
  //   const ingredients = Array.from({ length: 20 })
  //     .map((_, index) => {
  //       const ingredient = mealDetail[`strIngredient${index + 1}`];
  //       const measure = mealDetail[`strMeasure${index + 1}`];
  //       return ingredient && measure ? `${measure} ${ingredient}` : null;
  //     })
  //     .filter(Boolean)
  //     .join(', ');

  //   if (!ingredients) {
  //     setNutritionData([]);
  //     return;
  //   }

  //   setLoadingNutrition(true);

  //   fetch(
  //     `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
  //       ingredients
  //     )}`,
  //     {
  //       headers: { 'X-Api-Key': 'P3KS2zRUAhS+RK5r7T42PQ==3O3WWMPRtQzW3tCX' },
  //     }
  //   )
  //     .then((response) => response.json())
  //     .then((data) => {
  //       const totalRow = calculateTotalRow(data.items || []);
  //       setNutritionData([totalRow, ...(data.items || [])]); // Add "Total" row at the top
  //     })
  //     .catch((error) => console.error('Error fetching nutrition data:', error))
  //     .finally(() => setLoadingNutrition(false));
  // };

  // const calculateTotalRow = (items) => {
  //   const total = {
  //     name: 'Total',
  //     serving_size_g: items.reduce(
  //       (sum, item) => sum + (item.serving_size_g || 0),
  //       0
  //     ),
  //     calories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
  //     fat_total_g: items.reduce(
  //       (sum, item) => sum + (item.fat_total_g || 0),
  //       0
  //     ),
  //     fat_saturated_g: items.reduce(
  //       (sum, item) => sum + (item.fat_saturated_g || 0),
  //       0
  //     ),
  //     cholesterol_mg: items.reduce(
  //       (sum, item) => sum + (item.cholesterol_mg || 0),
  //       0
  //     ),
  //     sodium_mg: items.reduce((sum, item) => sum + (item.sodium_mg || 0), 0),
  //     carbohydrates_total_g: items.reduce(
  //       (sum, item) => sum + (item.carbohydrates_total_g || 0),
  //       0
  //     ),
  //     fiber_g: items.reduce((sum, item) => sum + (item.fiber_g || 0), 0),
  //     sugar_g: items.reduce((sum, item) => sum + (item.sugar_g || 0), 0),
  //     protein_g: items.reduce((sum, item) => sum + (item.protein_g || 0), 0),
  //   };

  //   // Round all numeric values to one decimal place
  //   Object.keys(total).forEach((key) => {
  //     if (typeof total[key] === 'number') {
  //       total[key] = total[key].toFixed(1); // Round to 1 decimal place
  //     }
  //   });

  //   return total;
  // };

  // const roundToDecimal = (value) => {
  //   if (typeof value === 'number' && !isNaN(value)) {
  //     return value.toFixed(1); // Round to 1 decimal place
  //   }
  //   return '-'; // Return a fallback value for non-numeric inputs
  // };

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppBackground.jpeg?alt=media&token=ff5e6fc2-e72f-4d8c-a469-633d4b8430bd',
      }}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}>
      <SafeAreaView style={styles.container}>
        {/* Scrollable Categories and Meals List */}
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll} // Listen to scroll events
          scrollEventThrottle={16} // Throttle for better performance
        >
          {/* Category List */}
          <View style={styles.categoryContainer}>
            <Text style={styles.title}>Categories</Text>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.idCategory}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => fetchMealsByCategory(item.strCategory)}>
                  <View style={styles.categoryItem}>
                    <Image
                      source={{ uri: item.strCategoryThumb }}
                      style={styles.categoryImage}
                    />
                    <Text style={styles.categoryText}>{item.strCategory}</Text>
                  </View>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {loadingMeals ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          ) : meals.length > 0 ? (
            <View style={styles.mealsContainer}>
              {/* Dynamically display the selected category name */}
              <Text style={styles.mealsTitle}>{selectedCategoryName}</Text>
              <TextInput
                style={styles.searchBar}
                placeholder={`Search meal in ${selectedCategoryName}`}
                value={searchTerm}
                onChangeText={(text) => setSearchTerm(text)}
              />

              <FlatList
                data={filteredMeals}
                keyExtractor={(item) => item.idMeal}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.mealItem, { width: itemWidth }]}
                    onPress={() => {
                      setCurrentMealID(item.idMeal);
                      setModalVisible(true);
                    }}>
                    <Image
                      source={{ uri: item.strMealThumb }}
                      style={styles.mealImage}
                    />
                    {/* Star Tag */}
                    <TouchableOpacity
                      style={styles.starTag}
                      onPress={() => {
                        const mealRatings = averageRatings[item.idMeal]; // Get ratings from state
                        if (mealRatings) {
                          setCurrentMealRatings(mealRatings); // Set the modal data
                          setRatingsModalVisible(true); // Open the modal
                        } else {
                          alert('No ratings available for this meal.');
                        }
                      }}>
                      <AntDesign name="star" size={18} color="#FFD700" />
                      <Text style={styles.starTagText}>
                        {averageRatings[item.idMeal]?.averageRating ||
                          'Not rated yet'}
                      </Text>
                    </TouchableOpacity>

                    {/* Heart Icon */}
                    <TouchableOpacity
                      onPress={() => toggleLike(item.idMeal)}
                      style={styles.heartIcon}>
                      <AntDesign
                        name={likedMeals[item.idMeal] ? 'heart' : 'hearto'}
                        size={18}
                        color={likedMeals[item.idMeal] ? 'red' : 'black'}
                      />
                    </TouchableOpacity>
                    <View style={styles.mealFooter}>
                      <Text style={styles.mealText}>{item.strMeal}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                numColumns={2} // Two columns layout
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : null}
        </ScrollView>
        {/* Scroll to Top Button */}
        {isScrollTopVisible && (
          <TouchableOpacity
            style={styles.scrollToTopButton}
            onPress={scrollToTop}>
            <Text style={styles.scrollToTopText}>^</Text>
          </TouchableOpacity>
        )}

        <Modal
          visible={ratingsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setRatingsModalVisible(false)}>
          <View style={styles.modalContainer2}>
            <View style={styles.modalContent2}>
              <Text style={styles.modalTitle2}>User Reviews</Text>
              <Text style={styles.modalAverageRating}>
                ⭐{' '}
                {currentMealRatings.averageRating === 'Not rated yet'
                  ? 'No ratings yet'
                  : `${currentMealRatings.averageRating} out of 5`}
              </Text>
              <Text style={styles.modalTotalVotes}>
                {currentMealRatings.totalVotes} user ratings
              </Text>

              {/* Rating Breakdown for All Stars */}
              {[5, 4, 3, 2, 1].map((star) => (
                <View key={star} style={styles.ratingRow}>
                  <Text style={styles.ratingText}>{star} Stars</Text>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${
                            currentMealRatings.percentages[star] || 0
                          }%`,
                        }, // Ensure 0% for stars without votes
                      ]}
                    />
                  </View>
                  <Text style={styles.percentageText}>
                    {currentMealRatings.percentages[star] || 0}%
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.closeButton2}
                onPress={() => setRatingsModalVisible(false)}>
                <Text style={styles.closeButtonText2}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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

export default RecipesData;

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    paddingTop: 20,
    //backgroundColor: '#f9f9f9',
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
  categoryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingBottom: 10,
    zIndex: 1, // Ensure categories stay on top
    elevation: 1, // This ensures it stays on top in Android
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  categoryImage: {
    borderWidth: 2,
    borderColor: '#ccc',
    marginBottom: 10,
    width: Dimensions.get('window').width * 0.2,
    height: Dimensions.get('window').width * 0.2,
    borderRadius: (Dimensions.get('window').width * 0.2) / 2,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingVertical: 20,
    flexGrow: 1, // Ensure the scroll view uses the available space
  },
  mealsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  mealsContainer: {
    marginTop: 20,
    alignItems: 'center', // Center the meals list horizontally
  },
  heartIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Optional: Add a background for better visibility
    padding: 5,
    borderRadius: 50, // Make it circular
    zIndex: 10, // Ensure the heart icon is on top of the image
  },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    width: '80%',
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 40,
    right: 10,
    backgroundColor: 'black',
    borderRadius: 25,
    width: 30,
    height: 30,
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
  mealItem: {
    alignItems: 'center',
    margin: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  mealImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mealText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  starTag: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    position: 'absolute',
    top: 5,
    left: 0,
    zIndex: 10,
    padding: 5,
    alignItems: 'center',
    elevation: 3,
  },
  starTagText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContainer2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent2: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalAverageRating: {
    fontSize: 18,
    marginVertical: 5,
  },
  modalTotalVotes: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    width: '20%',
    fontSize: 14,
  },
  progressBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginHorizontal: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 5,
  },
  percentageText: {
    width: '10%',
    fontSize: 14,
    textAlign: 'right',
  },
  closeButton2: {
    marginTop: 20,
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText2: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
