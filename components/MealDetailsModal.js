// MealDetailsModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Button,
  Linking,
  ImageBackground,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';

// Create a cache object outside the component
const mealDetailsCache = {};

const MealDetailsModal = ({
  mealID,
  modalVisible,
  setModalVisible,
  averageRatings,
  setAverageRatings,
}) => {
  const [mealDetails, setMealDetails] = useState(null);
  const [loadingMealDetails, setLoadingMealDetails] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [mealSpecificRating, setMealSpecificRating] = useState(0);
  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [currentMealRatings, setCurrentMealRatings] = useState({
    totalVotes: 0,
    percentages: {},
    averageRating: 0,
  });

  useEffect(() => {
    if (mealID && modalVisible) {
      fetchMealDetails(mealID);
    }
  }, [mealID, modalVisible]);

  const fetchMealDetails = (mealID) => {
    if (mealDetailsCache[mealID]) {
      setMealDetails(mealDetailsCache[mealID]);
      fetchNutritionData(mealDetailsCache[mealID]);
      return;
    }

    setLoadingMealDetails(true);

    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`)
      .then((response) => response.json())
      .then((data) => {
        const mealDetail = data.meals[0];
        mealDetailsCache[mealID] = mealDetail;
        setMealDetails(mealDetail);
        fetchNutritionData(mealDetail);
      })
      .catch((error) => {
        console.error('Error fetching meal details:', error);
      })
      .finally(() => {
        setLoadingMealDetails(false);
      });
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
        setNutritionData([totalRow, ...(data.items || [])]);
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

    Object.keys(total).forEach((key) => {
      if (typeof total[key] === 'number') {
        total[key] = total[key].toFixed(1);
      }
    });

    return total;
  };

  const roundToDecimal = (value) => (value ? parseFloat(value).toFixed(1) : '-');

  const openRatingModal = () => {
    setModalVisible(false);
    setRatingModalVisible(true);
  };

  const handleSaveRating = async () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert('You must be logged in to rate meals.');
      return;
    }

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
      setModalVisible(true);
    } else {
      alert('Please select a rating before saving.');
    }
  };

  const handleCloseRatingModal = () => {
    setMealSpecificRating(0);
    setRatingModalVisible(false);
    setModalVisible(true);
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

    const percentages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const [star, count] of Object.entries(ratings)) {
      percentages[star] = Math.round((count / totalVotes) * 100);
    }

    if (totalVotes === 0) {
      return {
        totalVotes: 0,
        percentages,
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

  return (
    <>
      {/* Meal Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {loadingMealDetails ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : mealDetails ? (
              <>
                <ScrollView style={styles.detailsScroll}>
                  <Text style={styles.mealDetailTitle}>
                    {mealDetails.strMeal}
                  </Text>

                  <Image
                    source={{ uri: mealDetails.strMealThumb }}
                    style={styles.mealDetailImage}
                  />
                  <TouchableOpacity style={styles.rateButton} onPress={openRatingModal}>
                    <Text style={styles.rateButtonText}>Rate this Meal</Text>
                  </TouchableOpacity>
                  {loadingNutrition ? (
                    <ActivityIndicator size="large" color="#0000ff" />
                  ) : nutritionData && nutritionData.length > 0 ? (
                    <ScrollView style={styles.nutritionTableScroll} horizontal>
                      <ScrollView style={styles.nutritionTableVerticalScroll}>
                        <View style={styles.table}>
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
                          {nutritionData.map((item, index) => (
                            <View
                              key={index}
                              style={[
                                styles.tableRow,
                                item.name === 'Total' && styles.totalRow,
                              ]}>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.name || '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.serving_size_g
                                  ? `${roundToDecimal(item.serving_size_g)}g`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.calories
                                  ? roundToDecimal(item.calories)
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.fat_total_g
                                  ? `${roundToDecimal(item.fat_total_g)}g`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.fat_saturated_g
                                  ? `${roundToDecimal(item.fat_saturated_g)}g`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.cholesterol_mg
                                  ? `${roundToDecimal(item.cholesterol_mg)}mg`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.sodium_mg
                                  ? `${roundToDecimal(item.sodium_mg)}mg`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
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
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.fiber_g
                                  ? `${roundToDecimal(item.fiber_g)}g`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
                                ]}>
                                {item.sugar_g
                                  ? `${roundToDecimal(item.sugar_g)}g`
                                  : '-'}
                              </Text>
                              <Text
                                style={[
                                  styles.cell,
                                  item.name === 'Total' && styles.totalCellText,
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

                  <Text style={styles.sectionTitle}>Method</Text>
                  <View style={styles.instructionsContainer}>
                    {mealDetails.strInstructions
                      .replace(/\b(STEP\s*\d+|\d+(\)|\.|-))\b/g, '')
                      .split('. ')
                      .map((instruction, index) => {
                        if (instruction.trim() === '') return null;
                        return (
                          <View key={index} style={styles.instructionItem}>
                            <View style={styles.stepNumber}>
                              <Text style={styles.stepNumberText}>
                                {index + 1}
                              </Text>
                            </View>
                            <View style={styles.instructionContent}>
                              <Text style={styles.instructionText}>
                                {instruction.trim()}.
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                  </View>

                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  <View style={styles.ingredientsContainer}>
                    {Array.from({ length: 20 }).map((_, index) => {
                      const ingredient =
                        mealDetails[`strIngredient${index + 1}`];
                      const measure = mealDetails[`strMeasure${index + 1}`];
                      const ingredientImage = `https://www.themealdb.com/images/ingredients/${ingredient}.png`;

                      return ingredient ? (
                        <View key={index} style={styles.ingredientItem}>
                          <Image
                            source={{ uri: ingredientImage }}
                            style={styles.ingredientImage}
                            resizeMode="contain"
                          />
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

                  {mealDetails.strYoutube ? (
                    <View style={styles.videoContainer}>
                      <Text style={styles.sectionTitle}>Video Tutorial</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(mealDetails.strYoutube)}>
                        <Text style={styles.youtubeLink}>Watch on YouTube</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </ScrollView>

                <View style={styles.fixedCloseButtonContainer}>
                  <Button
                    title="Close"
                    onPress={() => {
                      setMealSpecificRating(0);
                      setModalVisible(false);
                    }}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
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
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
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

      {/* Ratings Breakdown Modal */}
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
            {[5, 4, 3, 2, 1].map((star) => (
              <View key={star} style={styles.ratingRow}>
                <Text style={styles.ratingText}>{star} Stars</Text>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${currentMealRatings.percentages[star] || 0}%`,
                      },
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
    </>
  );
};

export default MealDetailsModal;

const styles = StyleSheet.create({
  // Styles moved here from recipes.js for modal, instructions, rating, etc.
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 100,
    paddingBottom: 50,
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%',
    justifyContent: 'space-between',
  },
  detailsScroll: {
    flexGrow: 0,
    marginBottom: 30,
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
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
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
  instructionsContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6347',
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
    flex: 1,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
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
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 5,
  },
  ingredientText: {
    fontSize: 16,
    color: '#333',
    flexShrink: 1,
  },
  ingredientMeasure: {
    fontWeight: 'bold',
    color: '#FF6347',
  },
  videoContainer: {
    marginTop: 20,
  },
  youtubeLink: {
    fontSize: 18,
    color: 'blue',
    textDecorationLine: 'underline',
  },
  fixedCloseButtonContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  nutritionTableScroll: {
    maxHeight: 200,
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
    width: 110,
    padding: 8,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cell: {
    width: 110,
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
  ratingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ratingModalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ratingButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#FF6347',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
