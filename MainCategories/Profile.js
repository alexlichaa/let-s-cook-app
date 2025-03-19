import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Button,
  ImageBackground,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import firebase from 'firebase';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';

const ProfileScreen = ({ navigation }) => {
  // Effect to scroll to the top when the modal opens
  useEffect(() => {
    if (isAddMealModalVisible && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true }); // Scroll to top
    }
  }, [isAddMealModalVisible]);

  const [userData, setUserData] = useState({
    username: '',
    email: '',
    profilePhoto: null,
  });

  const [selectedCategory, setSelectedCategory] = useState('');
  const categories = [
    { label: 'Beef', value: 'Beef' },
    { label: 'Chicken', value: 'Chicken' },
    { label: 'Dessert', value: 'Dessert' },
    { label: 'Lamb', value: 'Lamb' },
    { label: 'Miscellaneous', value: 'Miscellaneous' },
    { label: 'Pasta', value: 'Pasta' },
    { label: 'Pork', value: 'Pork' },
    { label: 'Seafood', value: 'Seafood' },
    { label: 'Side', value: 'Side' },
    { label: 'Starter', value: 'Starter' },
    { label: 'Vegan', value: 'Vegan' },
    { label: 'Vegetarian', value: 'Vegetarian' },
    { label: 'Breakfast', value: 'Breakfast' },
    { label: 'Goat', value: 'Goat' },
  ];

  const [preferencesIds, setPreferencesIds] = useState([]);
  const [preferencesMeals, setPreferencesMeals] = useState([]);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isAddMealModalVisible, setIsAddMealModalVisible] = useState(false);
  const [mealDetails, setMealDetails] = useState(null);
  const [loadingMealDetails, setLoadingMealDetails] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [measurementsIngredients, setMeasurementsIngredients] = useState([
    { measurement: '', ingredient: '', unit: '' },
  ]);
  const [mealPhoto, setMealPhoto] = useState(null);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [mealData, setMealData] = useState({
    name: '',
    instructions: [''],
    ingredients: [{ measurement: '', ingredient: '', unit: '' }],
    youtubeUrl: '',
  });
  const units = [
    { label: 'g', value: 'g' },
    { label: 'mg', value: 'mg' },
    { label: 'L', value: 'L' },
    { label: 'ml', value: 'ml' },
    { label: 'tsp', value: 'tsp' },
    { label: 'tbsp', value: 'tbsp' },
    { label: 'cup', value: 'cup' },
    { label: 'oz', value: 'oz' },
    { label: 'lb', value: 'lb' },
    { label: 'pcs', value: 'pcs' },
  ];

  const [favorites, setFavorites] = useState([]);
  const [favoriteMeals, setFavoriteMeals] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [enableScrollToEnd, setEnableScrollToEnd] = useState(false);
  const [userMeals, setUserMeals] = useState([]);
  const [loadingUserMeals, setLoadingUserMeals] = useState(true);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [mealSpecificRating, setMealSpecificRating] = useState(0);
  const [averageRatings, setAverageRatings] = useState({});
  const [currentMealRatings, setCurrentMealRatings] = useState({
    totalVotes: 0,
    percentages: {},
    averageRating: 0,
  });

  // Fetch user meals from Firestore
  useEffect(() => {
    const fetchUserMeals = async () => {
      const user = firebase.auth().currentUser;
      if (!user) {
        setLoadingUserMeals(false);
        return;
      }

      try {
        const mealsSnapshot = await firebase
          .firestore()
          .collection('USERSinfo')
          .doc(user.uid)
          .collection('Meals')
          .get();

        const meals = mealsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUserMeals(meals);
      } catch (error) {
        console.error('Error fetching user meals:', error);
      } finally {
        setLoadingUserMeals(false);
      }
    };

    fetchUserMeals();
  }, []);

  // Function to handle meal photo selection
  const handleSelectMealPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      console.log('Meal Photo URI:', selectedAsset.uri);
      setMealPhoto(selectedAsset.uri);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = firebase.auth().currentUser;
      if (user) {
        console.log('before try user: ', user);
        try {
          console.log('after try user: ', user);
          const userDoc = await firebase
            .firestore()
            .collection('USERSinfo')
            .doc(user.uid)
            .get();
          console.log('userDoc: ', userDoc);
          console.log('before if userDoc.exists: ', userDoc.exists);
          if (userDoc.exists) {
            console.log('after if userDoc.exists: ', userDoc.exists);
            const userData = userDoc.data();
            setUserData({
              username: userData.username,
              email: userData.email,
              profilePhoto: userData.profilePhoto,
            });
            if (userData.favorites) {
              setFavorites(userData.favorites);
            }
            if (userData.Preferences) {
              // **Fetch Preferences**
              setPreferencesIds(userData.Preferences);
            }
          } else {
            console.log('No user data found!');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          Alert.alert('Error', 'Failed to load user data');
        }
      }
    };

    fetchUserData();
  }, []);

  // Fetch meal details for favorites
  useEffect(() => {
    const fetchFavoriteMeals = async () => {
      try {
        const mealPromises = favorites.map((mealID) =>
          fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`
          )
            .then((response) => response.json())
            .then((data) => data.meals[0])
        );

        const meals = await Promise.all(mealPromises);
        setFavoriteMeals(meals);
      } catch (error) {
        console.error('Error fetching favorite meals:', error);
      } finally {
        setLoadingFavorites(false);
      }
    };

    if (favorites.length > 0) {
      fetchFavoriteMeals();
    } else {
      setLoadingFavorites(false);
    }
  }, [favorites]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission denied',
            'You need to grant storage access to upload a profile photo.'
          );
        }
      }
    })();
  }, []);

  useEffect(() => {
    const fetchPreferencesMeals = async () => {
      if (preferencesIds.length === 0) {
        setPreferencesMeals([]);
        setLoadingPreferences(false);
        return;
      }

      try {
        const mealPromises = preferencesIds.map((mealID) =>
          fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`
          )
            .then((response) => response.json())
            .then((data) => data.meals[0])
        );

        const meals = await Promise.all(mealPromises);
        setPreferencesMeals(meals);
      } catch (error) {
        console.error('Error fetching preferences meals:', error);
        Alert.alert('Error', 'Failed to load preferred meals.');
      } finally {
        setLoadingPreferences(false);
      }
    };

    fetchPreferencesMeals();
  }, [preferencesIds]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission denied',
        'You need to grant storage access to upload a profile photo.'
      );
      return false;
    }
    return true;
  };

  const handleSelectProfilePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    console.log('Image Picker Result:', result);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      console.log('Selected Image URI:', selectedAsset.uri);
      setProfilePhoto(selectedAsset.uri);
    } else {
      console.log('Image selection was cancelled or no assets found.');
    }
  };

  const handleSave = async () => {
    try {
      const user = firebase.auth().currentUser;
      const userId = user.uid;
      const updates = {};

      console.log('User ID:', userId);
      console.log('Profile Photo URI:', profilePhoto);

      if (userData.username && userData.username !== user.displayName) {
        updates.displayName = userData.username;
        await firebase.firestore().collection('USERSinfo').doc(userId).update({
          username: userData.username,
        });
      }

      if (profilePhoto) {
        const storageRef = firebase
          .storage()
          .ref(`usersProfiles/${userId}/profilePhoto`);

        console.log('Starting upload to Firebase Storage...');

        const response = await fetch(profilePhoto);
        const blob = await response.blob();
        await storageRef.put(blob);
        const photoURL = await storageRef.getDownloadURL();

        updates.photoURL = photoURL;

        await firebase.firestore().collection('USERSinfo').doc(userId).update({
          profilePhoto: photoURL,
        });

        setUserData((prevData) => ({
          ...prevData,
          profilePhoto: photoURL,
        }));
      }

      if (Object.keys(updates).length > 0) {
        await user.updateProfile(updates);
      }

      if (userData.email && userData.email !== user.email) {
        await user.updateEmail(userData.email);
        await firebase.firestore().collection('USERSinfo').doc(userId).update({
          email: userData.email,
        });
      }

      setIsEditing(false);
      setProfilePhoto(null);

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordData;

    // Check if the new password meets length requirements
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Check if the new passwords match
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      const user = firebase.auth().currentUser;

      // Reauthenticate the user with old password
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        oldPassword
      );
      await user.reauthenticateWithCredential(credential); // This will throw an error if the old password is incorrect

      // Update to the new password
      await user.updatePassword(newPassword);

      Alert.alert('Success', 'Password updated successfully');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'The old password is incorrect');
      } else {
        Alert.alert('Error', 'The old password is incorrect');
      }
    }
  };

  const handleBackPress = () => {
    navigation.navigate('Main');
  };

  // const handleAddIngredient = () => {
  //   setMealData((prevData) => ({
  //     ...prevData,
  //     ingredients: [
  //       ...prevData.ingredients,
  //       { measurement: '', ingredient: '' },
  //     ],
  //   }));
  // };

  // const handleRemoveIngredient = (index) => {
  //   setMealData((prevData) => ({
  //     ...prevData,
  //     ingredients: prevData.ingredients.filter((_, i) => i !== index),
  //   }));
  // };

  // const handleSaveMeal = () => {
  //   // Add functionality to save meal here
  //   Alert.alert('Meal Saved', 'Your meal has been saved successfully!');
  //   setIsAddMealModalVisible(false);
  //   setMealData({
  //     name: '',
  //     instructions: [''],
  //     ingredients: [{ measurement: '', ingredient: '' }],
  //   });
  //   setMeasurementsIngredients([{ measurement: '', ingredient: '' }]);
  // };

  const handleSaveMeal = async () => {
    console.log('Meal Data:', mealData);
    console.log('Selected Category:', selectedCategory);
    console.log('Meal Photo URI:', mealPhoto);

    try {
      // Validate meal photo
      if (!mealPhoto) {
        Alert.alert('Error', 'Meal photo is required!');
        return;
      }

      // Validate meal name
      if (!mealData.name || mealData.name.trim() === '') {
        Alert.alert('Error', 'Meal name is required!');
        return;
      }

      // Validate category selection
      if (!selectedCategory) {
        Alert.alert('Error', 'Please select a category for the meal!');
        return;
      }

      // Validate instructions
      if (
        mealData.instructions.length === 0 ||
        mealData.instructions.some((inst) => inst.trim() === '')
      ) {
        Alert.alert(
          'Error',
          'Please add at least one instruction and ensure no instruction is empty!'
        );
        return;
      }

      // Validate ingredients
      if (
        measurementsIngredients.length === 0 ||
        measurementsIngredients.some(
          (item) =>
            item.measurement.trim() === '' ||
            item.ingredient.trim() === '' ||
            !item.unit
        )
      ) {
        Alert.alert(
          'Error',
          'Please provide valid measurements, ingredients, and units!'
        );
        return;
      }

      // Update mealData.ingredients with measurementsIngredients
      const updatedMealData = {
        ...mealData,
        ingredients: measurementsIngredients, // Synchronize the ingredients
        category: selectedCategory,
        photo: mealPhoto,
      };

      console.log('Final Meal Data to Save:', updatedMealData);

      // Save to Firestore
      const user = firebase.auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated!');
        return;
      }

      const userDocRef = firebase
        .firestore()
        .collection('USERSinfo')
        .doc(user.uid);

      await userDocRef.collection('Meals').add(updatedMealData);

      Alert.alert('Success', 'Your meal has been saved successfully!');

      // Reset state after saving
      setMealData({
        name: '',
        instructions: [''],
        ingredients: [{ measurement: '', ingredient: '', unit: '' }],
        youtubeUrl: '',
      });
      setMeasurementsIngredients([
        { measurement: '', ingredient: '', unit: '' },
      ]);
      setMealPhoto(null);
      setIsAddMealModalVisible(false); // Close the modal
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save the meal. Please try again.');
    }
  };

  // Fetch meal details by meal ID
  const fetchMealDetails = (mealID) => {
    setLoadingMealDetails(true);
    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealID}`)
      .then((response) => response.json())
      .then((data) => {
        setMealDetails(data.meals[0]); // Set the details of the meal
        setLoadingMealDetails(false);
        setModalVisible(true); // Show modal with meal details
        fetchNutritionData(data.meals[0]);
      })
      .catch((error) => {
        console.error('Error fetching meal details:', error);
        setLoadingMealDetails(false);
      });
  };

  const toggleLike = async (mealID) => {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const userDocRef = firebase
      .firestore()
      .collection('USERSinfo')
      .doc(user.uid);

    try {
      if (favorites.includes(mealID)) {
        // If meal is already in favorites, remove it
        await userDocRef.update({
          favorites: firebase.firestore.FieldValue.arrayRemove(mealID),
        });
        setFavorites((prevFavorites) =>
          prevFavorites.filter((id) => id !== mealID)
        );
      } else {
        // If meal is not in favorites, add it
        await userDocRef.update({
          favorites: firebase.firestore.FieldValue.arrayUnion(mealID),
        });
        setFavorites((prevFavorites) => [...prevFavorites, mealID]);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const handleAddRow = () => {
    setMeasurementsIngredients([
      ...measurementsIngredients,
      { measurement: '', ingredient: '', unit: '' },
    ]);
  };

  const handleDeleteRow = (index) => {
    const updatedRows = measurementsIngredients.filter((_, i) => i !== index);
    setMeasurementsIngredients(updatedRows);
  };

  const handleInputChange = (index, field, value) => {
    const updatedRows = [...measurementsIngredients];
    updatedRows[index][field] = value;
    setMeasurementsIngredients(updatedRows);
  };

  const handleCloseMeal = () => {
    setIsAddMealModalVisible(false);
    setMealData({
      name: '',
      instructions: [''],
      ingredients: [{ measurement: '', ingredient: '', unit: '' }],
      youtubeUrl: '',
    });
    setMeasurementsIngredients([{ measurement: '', ingredient: '', unit: '' }]);
    setMealPhoto(null);
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

  // Open rating modal
  const openRatingModal = () => {
    setRatingModalVisible(true);
    setModalVisible(false); // Close meal details modal
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
      setModalVisible(true);
    } else {
      alert('Please select a rating before saving.');
    }
  };

  // Close rating modal
  const handleCloseRatingModal = () => {
    setMealSpecificRating(0);
    setRatingModalVisible(false);
    setModalVisible(true);
  };

  const fetchNutritionData2 = (mealDetail) => {
    if (!mealDetail.ingredients || mealDetail.ingredients.length === 0) {
      setNutritionData([]);
      return;
    }

    const unitMapping = {
      cup: 'c',
      tbsp: 'tb',
      tsp: 'ts',
      pcs: '',
    };

    const ingredients = mealDetail.ingredients
      ? mealDetail.ingredients
          .map((item) => {
            const unit = unitMapping[item.unit] || item.unit; // Map unit or use original
            return unit
              ? `${item.measurement} ${unit} ${item.ingredient}`
              : `${item.measurement} ${item.ingredient}`; // Exclude unit for "pcs"
          })
          .join(', ')
      : Array.from({ length: 20 })
          .map((_, index) => {
            const ingredient = mealDetail[`strIngredient${index + 1}`];
            const measure = mealDetail[`strMeasure${index + 1}`];
            return ingredient && measure ? `${measure} ${ingredient}` : null;
          })
          .filter(Boolean)
          .join(', ');

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

  const fetchMealDetailsFirestore = (mealID) => {
    const selectedMeal = userMeals.find((meal) => meal.id === mealID);
    console.log('selected meal: ', selectedMeal);
    if (selectedMeal) {
      console.log('in if selected meal: ', selectedMeal);
      setMealDetails(selectedMeal); // Set selected meal's details
      setModalVisible(true); // Open modal to show details
      fetchNutritionData2(selectedMeal); // Fetch nutrition data
    } else {
      console.error(`Meal with ID ${mealID} not found in userMeals.`);
    }
  };

  useEffect(() => {
    console.log('User Meals:', userMeals);
  }, [userMeals]);

  const handleSignOut = async () => {
    try {
      await firebase.auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }], // Reset the navigation stack to Login
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppBackground.jpeg?alt=media&token=ff5e6fc2-e72f-4d8c-a469-633d4b8430bd',
      }}
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.3 }}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.profilePhotoContainer}>
            <Image
              source={{
                uri: userData.profilePhoto || 'https://via.placeholder.com/150',
              }}
              style={styles.profilePhoto}
            />
            {isEditing && (
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={handleSelectProfilePhoto}>
                <Ionicons name="camera-outline" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.userInfoContainer}>
            {!isEditing && !isChangingPassword && (
              <>
                <Text style={styles.username}>{userData.username}</Text>
                <Text style={styles.email}>{userData.email}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}>
                  <Text style={styles.buttonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
            {isEditing && (
              <>
                <Text style={styles.email}>{userData.email}</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={[
                      styles.input,
                      isChangingPassword && styles.disabledInput,
                    ]}
                    value={userData.username}
                    onChangeText={(text) =>
                      setUserData({ ...userData, username: text })
                    }
                    editable={!isChangingPassword}
                  />
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}>
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsEditing(false)}>
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={() => setIsChangingPassword(true)}>
                  <Text style={styles.buttonText}>Change Password</Text>
                </TouchableOpacity>
              </>
            )}
            {isChangingPassword && (
              <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Old Password</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={passwordData.oldPassword}
                    onChangeText={(text) =>
                      setPasswordData({ ...passwordData, oldPassword: text })
                    }
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={passwordData.newPassword}
                    onChangeText={(text) =>
                      setPasswordData({ ...passwordData, newPassword: text })
                    }
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={passwordData.confirmPassword}
                    onChangeText={(text) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: text,
                      })
                    }
                  />
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleChangePassword}>
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsChangingPassword(false)}>
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>

          {/* Additional Sections */}
          {!isEditing && !isChangingPassword && (
            <>
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>Favorites</Text>
                  <FontAwesome name="heart" size={24} color="black" />
                </View>
                <View style={styles.favoritesContainer}>
                  {loadingFavorites ? (
                    <ActivityIndicator size="large" color="#0000ff" />
                  ) : favoriteMeals.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}>
                      {favoriteMeals.map((meal) => (
                        <View key={meal.idMeal} style={styles.favoriteItem}>
                          <View style={styles.mealImageContainer}>
                            <TouchableOpacity
                              onPress={() => fetchMealDetails(meal.idMeal)}>
                              <Image
                                source={{ uri: meal.strMealThumb }}
                                style={styles.favoriteImage}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => toggleLike(meal.idMeal)}
                              style={styles.heartIcon}>
                              <FontAwesome
                                name={
                                  favorites.includes(meal.idMeal)
                                    ? 'heart'
                                    : 'heart-o'
                                }
                                size={24}
                                color={
                                  favorites.includes(meal.idMeal)
                                    ? 'red'
                                    : 'black'
                                }
                              />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.favoriteText}>
                            {meal.strMeal}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noFavoritesText}>
                      No favorites added yet.
                    </Text>
                  )}

                 
                </View>
              </View>

              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>My Meals</Text>
                  <FontAwesome name="cutlery" size={24} color="black" />
                  <TouchableOpacity
                    style={styles.addMealButton}
                    onPress={() => setIsAddMealModalVisible(true)}>
                    <Text style={styles.buttonText}>Add a Meal</Text>
                  </TouchableOpacity>
                </View>

                {loadingUserMeals ? (
                  <ActivityIndicator size="large" color="#0000ff" />
                ) : userMeals.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {userMeals.map((meal) => (
                      <View key={meal.id} style={styles.favoriteItem}>
                        <View style={styles.mealImageContainer}>
                          <TouchableOpacity
                            onPress={() => fetchMealDetailsFirestore(meal.id)}>
                            <Image
                              source={{ uri: meal.photo }}
                              style={styles.favoriteImage}
                            />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.favoriteText}>{meal.name}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noFavoritesText}>
                    No meals added yet.
                  </Text>
                )}
              </View>

              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>
                    Based on your preferences
                  </Text>
                  <FontAwesome name="user" size={24} color="black" />
                </View>
                <View style={styles.preferencesContainer}>
                  {loadingPreferences ? (
                    <ActivityIndicator size="large" color="#0000ff" />
                  ) : preferencesMeals.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}>
                      {preferencesMeals.map((meal) => (
                        <View key={meal.idMeal} style={styles.preferenceItem}>
                          <View style={styles.mealImageContainer}>
                            <TouchableOpacity
                              onPress={() =>
                                fetchMealDetails(meal.idMeal)
                              }>
                              <Image
                                source={{ uri: meal.strMealThumb }}
                                style={styles.preferenceImage}
                              />
                            </TouchableOpacity>
                            {/* Optionally, add actions like remove from preferences */}
                          </View>
                          <Text style={styles.preferenceText}>
                            {meal.strMeal}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noPreferencesText}>
                      No preferred meals found.
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}

          <Modal
            visible={isAddMealModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsAddMealModalVisible(false)}>
            <View style={styles.modalContainer2}>
              <View style={styles.modalContent}>
                {/* Reference for ScrollView */}
                <ScrollView
                  ref={(ref) => (scrollViewRef = ref)} // Add a reference to the ScrollView
                  onContentSizeChange={() => {
                    if (enableScrollToEnd) {
                      scrollViewRef.scrollToEnd({ animated: true });
                    }
                  }} // Automatically scroll to the end when content changes
                >
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Meal's Info</Text>
                  </View>

                  {/* Meal Photo Upload */}
                  <Text style={styles.label2}>Meal Photo</Text>
                  <TouchableOpacity
                    onPress={handleSelectMealPhoto}
                    style={styles.photoUploadButton}>
                    {mealPhoto ? (
                      <Image
                        source={{ uri: mealPhoto }}
                        style={styles.mealPhoto}
                      />
                    ) : (
                      <Text style={styles.photoUploadText}>Select Photo</Text>
                    )}
                  </TouchableOpacity>

                  {/* Name Input */}
                  <Text style={styles.label2}>Name</Text>
                  <TextInput
                    style={styles.input2}
                    placeholder="Enter meal name"
                    value={mealData.name}
                    onChangeText={(text) => {
                      console.log('Meal Name:', text); // Log meal name
                      setMealData((prev) => ({ ...prev, name: text }));
                    }}
                  />

                  {/* Category Dropdown */}
                  <Text style={styles.label2}>Category</Text>
                  <View style={styles.dropdownWrapper}>
                    <View style={styles.dropdownStyle}>
                      {/* New wrapper */}
                      <RNPickerSelect
                        onValueChange={(value) => {
                          console.log('Selected Category:', value); // Log category
                          setSelectedCategory(value);
                        }}
                        items={categories}
                        placeholder={{
                          label: 'Select a category',
                          value: null,
                        }}
                        style={{
                          inputAndroid: {
                            color: '#000', // Text color for Android
                          },
                          inputIOS: {
                            color: '#000', // Text color for iOS
                          },
                        }}
                      />
                    </View>
                  </View>

                  {/* Instructions Input */}
                  <Text style={styles.label2}>Instructions</Text>
                  {mealData.instructions.map((instruction, index) => (
                    <View key={index} style={styles.row}>
                      <Text style={styles.instructionIndex}>{index + 1}.</Text>
                      <TextInput
                        style={styles.longInput}
                        placeholder="Instruction"
                        value={instruction}
                        onChangeText={(text) => {
                          console.log(`Instruction ${index + 1}:`, text);
                          const updatedInstructions = [
                            ...mealData.instructions,
                          ];
                          updatedInstructions[index] = text;
                          setMealData((prev) => ({
                            ...prev,
                            instructions: updatedInstructions,
                          }));
                        }}
                      />
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          setEnableScrollToEnd(true);
                          setMealData((prev) => ({
                            ...prev,
                            instructions: [...prev.instructions, ''],
                          }));
                          setTimeout(() => {
                            scrollViewRef.scrollToEnd({ animated: true }); // Scroll to the end after adding a row
                          }, 100);
                        }}>
                        <Text style={styles.addButtonText}>+</Text>
                      </TouchableOpacity>
                      {mealData.instructions.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => {
                            setMealData((prev) => ({
                              ...prev,
                              instructions: prev.instructions.filter(
                                (_, i) => i !== index
                              ),
                            }));
                          }}>
                          <Text style={styles.deleteButtonText}>-</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* Measurements and Ingredients */}
                  <Text style={styles.label2}>Measurements & Ingredients</Text>
                  {measurementsIngredients.map((item, index) => (
                    <View key={index} style={styles.row}>
                      {/* Measurement and Unit Input */}
                      <View style={styles.measurementUnitRow}>
                        {/* Measurement Input */}
                        <TextInput
                          style={styles.measurementInput}
                          placeholder="Meas."
                          value={item.measurement}
                          onChangeText={(value) => {
                            handleInputChange(index, 'measurement', value);
                          }}
                        />

                        {/* Unit Dropdown */}
                        <RNPickerSelect
                          onValueChange={(value) => {
                            handleInputChange(index, 'unit', value);
                          }}
                          items={units}
                          value={item.unit}
                          placeholder={{ label: 'Unit', value: null }}
                          style={{
                            inputAndroid: styles.unitDropdown,
                            inputIOS: styles.unitDropdown,
                          }}
                        />
                      </View>

                      {/* Ingredient Input */}
                      <TextInput
                        style={styles.ingredientInput}
                        placeholder="Ingredient"
                        value={item.ingredient}
                        onChangeText={(value) => {
                          handleInputChange(index, 'ingredient', value);
                        }}
                      />

                      {/* Add/Remove Buttons */}
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          handleAddRow();
                        }}>
                        <Text style={styles.addButtonText}>+</Text>
                      </TouchableOpacity>

                      {measurementsIngredients.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteRow(index)}>
                          <Text style={styles.deleteButtonText}>-</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* YouTube Video URL Input */}
                  <Text style={styles.label2}>
                    YouTube Video URL (Optional)
                  </Text>
                  <TextInput
                    style={styles.input2}
                    placeholder="Enter YouTube URL"
                    value={mealData.youtubeUrl}
                    onChangeText={(text) =>
                      setMealData((prev) => ({ ...prev, youtubeUrl: text }))
                    }
                  />
                </ScrollView>

                {/* Done and Close Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={handleSaveMeal}>
                    <Text style={styles.doneButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeAddMealButton}
                    onPress={handleCloseMeal}>
                    <Text style={styles.doneButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
           {/* Modal for Meal Details */}
                  <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}>
                    <View style={styles.modalContainer2}>
                      <View style={styles.modalContent}>
                        {loadingMealDetails ? (
                          <ActivityIndicator size="large" color="#0000ff" />
                        ) : mealDetails ? (
                          <>
                            <ScrollView
                              style={styles.detailsScroll}
                              nestedScrollEnabled={true}>
                              <Text style={styles.mealDetailTitle}>
                                {mealDetails.name ||
                                  mealDetails.strMeal ||
                                  'No name available'}
                              </Text>

                              {mealDetails.photo || mealDetails.strMealThumb ? (
                                <Image
                                  source={{
                                    uri:
                                      mealDetails.photo ||
                                      mealDetails.strMealThumb,
                                  }}
                                  style={styles.mealDetailImage}
                                />
                              ) : (
                                <Text>No photo available</Text>
                              )}

                              <TouchableOpacity
                                style={styles.rateButton}
                                onPress={() => openRatingModal()}>
                                <Text style={styles.rateButtonText}>
                                  Rate this Meal
                                </Text>
                              </TouchableOpacity>
                              {loadingNutrition ? (
                                <ActivityIndicator
                                  size="large"
                                  color="#0000ff"
                                />
                              ) : nutritionData && nutritionData.length > 0 ? (
                                <ScrollView
                                  style={styles.nutritionTableScroll}
                                  horizontal>
                                  <ScrollView
                                    style={styles.nutritionTableVerticalScroll}>
                                    <View style={styles.table}>
                                      {/* Header */}
                                      <View
                                        style={[
                                          styles.tableRow,
                                          styles.tableHeader,
                                        ]}>
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
                                          <Text
                                            key={index}
                                            style={[styles.headerCell]}>
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
                                            item.name === 'Total' &&
                                              styles.totalRow, // Apply additional style for Total row
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
                                              ? `${roundToDecimal(
                                                  item.serving_size_g
                                                )}g`
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
                                              ? `${roundToDecimal(
                                                  item.fat_total_g
                                                )}g`
                                              : '-'}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.cell,
                                              item.name === 'Total' &&
                                                styles.totalCellText,
                                            ]}>
                                            {item.fat_saturated_g
                                              ? `${roundToDecimal(
                                                  item.fat_saturated_g
                                                )}g`
                                              : '-'}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.cell,
                                              item.name === 'Total' &&
                                                styles.totalCellText,
                                            ]}>
                                            {item.cholesterol_mg
                                              ? `${roundToDecimal(
                                                  item.cholesterol_mg
                                                )}mg`
                                              : '-'}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.cell,
                                              item.name === 'Total' &&
                                                styles.totalCellText,
                                            ]}>
                                            {item.sodium_mg
                                              ? `${roundToDecimal(
                                                  item.sodium_mg
                                                )}mg`
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
                                              ? `${roundToDecimal(
                                                  item.fiber_g
                                                )}g`
                                              : '-'}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.cell,
                                              item.name === 'Total' &&
                                                styles.totalCellText,
                                            ]}>
                                            {item.sugar_g
                                              ? `${roundToDecimal(
                                                  item.sugar_g
                                                )}g`
                                              : '-'}
                                          </Text>
                                          <Text
                                            style={[
                                              styles.cell,
                                              item.name === 'Total' &&
                                                styles.totalCellText,
                                            ]}>
                                            {item.protein_g
                                              ? `${roundToDecimal(
                                                  item.protein_g
                                                )}g`
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
                              <Text style={styles.sectionTitle}>
                                Instructions
                              </Text>
                              <View style={styles.instructionsContainer}>
                                {mealDetails?.strInstructions // Safely check if strInstructions exists
                                  ? mealDetails.strInstructions
                                      .replace(
                                        /\b(STEP\s*\d+|\d+(\)|\.|-))\b/g,
                                        ''
                                      ) // Clean up the instructions
                                      .split('. ')
                                      .map((instruction, index) => {
                                        if (instruction.trim() === '')
                                          return null; // Skip empty instructions
                                        return (
                                          <View
                                            key={index}
                                            style={styles.instructionItem}>
                                            <View style={styles.stepNumber}>
                                              <Text
                                                style={styles.stepNumberText}>
                                                {index + 1}
                                              </Text>
                                            </View>
                                            <View
                                              style={styles.instructionContent}>
                                              <Text
                                                style={styles.instructionText}>
                                                {instruction.trim()}.
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      })
                                  : mealDetails?.instructions && // Safely check if instructions array exists
                                    mealDetails.instructions.map(
                                      (instruction, index) => {
                                        return (
                                          <View
                                            key={index}
                                            style={styles.instructionItem}>
                                            <View style={styles.stepNumber}>
                                              <Text
                                                style={styles.stepNumberText}>
                                                {index + 1}
                                              </Text>
                                            </View>
                                            <View
                                              style={styles.instructionContent}>
                                              <Text
                                                style={styles.instructionText}>
                                                {instruction.trim()}.
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      }
                                    )}
                              </View>

                              <Text style={styles.sectionTitle}>
                                Ingredients & Measurements
                              </Text>
                              <View style={styles.ingredientsContainer}>
                                {/* Check if ingredients exist */}
                                {mealDetails.ingredients &&
                                mealDetails.ingredients.length > 0
                                  ? mealDetails.ingredients.map(
                                      (item, index) => (
                                        <View
                                          key={index}
                                          style={styles.ingredientItem}>
                                          {/* Ingredient Image */}
                                          <Image
                                            source={{
                                              uri: `https://www.themealdb.com/images/ingredients/${item.ingredient}.png`,
                                            }}
                                            style={styles.ingredientImage}
                                            resizeMode="contain"
                                          />
                                          {/* Measurement and Ingredient Name */}
                                          <Text style={styles.ingredientText}>
                                            <Text
                                              style={styles.ingredientMeasure}>
                                              {item.measurement} {item.unit}{' '}
                                            </Text>
                                            {item.ingredient}
                                          </Text>
                                        </View>
                                      )
                                    )
                                  : /* Fallback for MealDB API structure */
                                    Array.from({ length: 20 }).map(
                                      (_, index) => {
                                        const ingredient =
                                          mealDetails[
                                            `strIngredient${index + 1}`
                                          ];
                                        const measure =
                                          mealDetails[`strMeasure${index + 1}`];
                                        const ingredientImage = `https://www.themealdb.com/images/ingredients/${ingredient}.png`;

                                        return ingredient ? (
                                          <View
                                            key={index}
                                            style={styles.ingredientItem}>
                                            {/* Ingredient Image */}
                                            <Image
                                              source={{ uri: ingredientImage }}
                                              style={styles.ingredientImage}
                                              resizeMode="contain"
                                            />
                                            {/* Measurement and Ingredient Name */}
                                            <Text style={styles.ingredientText}>
                                              <Text
                                                style={
                                                  styles.ingredientMeasure
                                                }>
                                                {measure}{' '}
                                              </Text>
                                              {ingredient}
                                            </Text>
                                          </View>
                                        ) : null;
                                      }
                                    )}
                              </View>

                              {/* YouTube Video */}
                              {mealDetails.strYoutube ? (
                                <View style={styles.videoContainer}>
                                  <Text style={styles.sectionTitle}>
                                    Video Tutorial
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      Linking.openURL(mealDetails.strYoutube)
                                    }>
                                    <Text style={styles.youtubeLink}>
                                      Watch on YouTube
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}
                            </ScrollView>

                            {/* Fixed Close Button */}
                            <View style={styles.fixedCloseButtonContainer}>
                              <Button
                                title="Close"
                                onPress={() => setModalVisible(false)}
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
                                name={
                                  mealSpecificRating > index ? 'star' : 'star-o'
                                }
                                size={32}
                                color={
                                  mealSpecificRating > index
                                    ? '#FFD700'
                                    : '#ccc'
                                }
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                          }}>
                          <TouchableOpacity
                            style={[styles.ratingButton, styles.saveButton2]}
                            onPress={handleSaveRating}>
                            <Text style={styles.buttonText2}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.ratingButton, styles.closeButton2]}
                            onPress={handleCloseRatingModal}>
                            <Text style={styles.closeButtonText}>Close</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  dropdownWrapper: {
    marginBottom: 16, // Adds spacing below the dropdown
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    marginTop: 25,
  },
  backButton: {
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
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#E5E5E5',
  },
  changePhotoButton: {
    backgroundColor: '#555',
    padding: 10,
    borderRadius: 50,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    color: '#555',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: 'black',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginTop: 10,
    marginRight: 10,
  },
  changePasswordButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#a0a0a0',
  },
  sectionContainer: {
    marginVertical: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 10,
  },
  circleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  addMealButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 50,
    marginLeft: 10,
  },
  favoritesContainer: {
    marginTop: 10,
  },
  noFavoritesText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer2: {
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
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  videoContainer: {
    marginTop: 20,
  },
  youtubeLink: {
    fontSize: 18,
    color: 'blue',
    textAlign: 'left',
    textDecorationLine: 'underline',
  },
  fixedCloseButtonContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  favoriteItem: {
    marginHorizontal: 10, // Space between meal items
    marginBottom: 20, // Space below each meal item
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    width: 150, // Fixed width for all favorite items
    elevation: 3, // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  favoriteImage: {
    width: '100%', // Full width of the card
    height: 100, // Fixed height for consistent image size
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  mealImageContainer: {
    position: 'relative', // Allows placing the heart icon over the image
    width: '100%', // Full width of the container
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
  favoriteText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    flexWrap: 'wrap', // Allows the text to wrap to the next line
    maxWidth: '100%', // Ensures the text doesn't exceed the card's width
    lineHeight: 18, // Better readability for multiline text
    paddingHorizontal: 10, // Add padding for long text
    paddingVertical: 5, // Add vertical spacing
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label2: {
    fontSize: 16,
    marginBottom: 8,
  },
  input2: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 16,
  },
  doneButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignSelf: 'center',
  },
  closeAddMealButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignSelf: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  addButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: 'red',
    fontSize: 20,
    fontWeight: 'bold',
  },
  instructionIndex: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  longInput: {
    flex: 1,
    width: '90%',
    height: 40, // Set a fixed height
    marginRight: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  photoUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mealPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoUploadText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  dropdownStyle: {
    borderWidth: 1, // Add a visible border
    borderColor: '#ccc', // Light gray border color
    borderRadius: 5, // Rounded corners for a modern look
    padding: 10, // Inner padding for consistency with inputs
    backgroundColor: '#fff', // White background to match input fields
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
  saveButton2: {
    backgroundColor: '#4CAF50', // Save button background color (green)
  },
  closeButton2: {
    backgroundColor: '#FF6347', // Close button background color (red)
  },
  buttonText2: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Space between Back and Sign Out buttons
    alignItems: 'center', // Vertically align items
    marginBottom: 20, // Spacing below the row
    paddingHorizontal: 10, // Horizontal padding
  },
  signOutButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  measurementUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10, // Space between measurement+unit and ingredient
  },
  measurementInput: {
    width: 70, // Fixed width to display "Meas."
    height: 40, // Consistent height
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginRight: 0, // Remove space between measurement and unit
  },
  unitDropdown: {
    width: 50, // Align width with measurement
    height: 40, // Consistent height
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginLeft: 0, // Stick to measurement input
    backgroundColor: '#f9f9f9',
  },
  ingredientInput: {
    flex: 1, // Takes remaining space
    height: 40, // Consistent height
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginLeft: 10, // Space between unit and ingredient
  },
  preferencesContainer: {
    marginTop: 10,
  },
  preferenceItem: {
    marginHorizontal: 10, // Space between meal items
    marginBottom: 20, // Space below each meal item
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    width: 150, // Fixed width for all preference items
    elevation: 3, // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  preferenceImage: {
    width: '100%', // Full width of the card
    height: 100, // Fixed height for consistent image size
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  preferenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    flexWrap: 'wrap', // Allows the text to wrap to the next line
    maxWidth: '100%', // Ensures the text doesn't exceed the card's width
    lineHeight: 18, // Better readability for multiline text
    paddingHorizontal: 10, // Add padding for long text
    paddingVertical: 5, // Add vertical spacing
  },
  noPreferencesText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;
