import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import firebase from 'firebase';

const UsersMeals = () => {
  const [allUserMeals, setAllUserMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(true);

  useEffect(() => {
    const fetchAllUserMeals = async () => {
      try {
        const usersSnapshot = await firebase
          .firestore()
          .collection('USERSinfo')
          .get();
        const fetchMealsPromises = usersSnapshot.docs.map(async (userDoc) => {
          try {
            const userMealsSnapshot = await firebase
              .firestore()
              .collection('USERSinfo')
              .doc(userDoc.id)
              .collection('Meals')
              .get();

            return userMealsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
          } catch (error) {
            console.error(
              `Error fetching meals for user ${userDoc.id}:`,
              error
            );
            return [];
          }
        });

        const mealsArray = await Promise.all(fetchMealsPromises);
        const allMeals = mealsArray.flat();
        setAllUserMeals(allMeals);
      } catch (error) {
        console.error('Error fetching meals from all users:', error);
      } finally {
        setLoadingMeals(false);
      }
    };

    fetchAllUserMeals();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meals from All Users</Text>
      {loadingMeals ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : allUserMeals.length > 0 ? (
        <ScrollView contentContainerStyle={styles.mealsContainer}>
          {allUserMeals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              {meal.photo ? (
                <Image source={{ uri: meal.photo }} style={styles.mealImage} />
              ) : (
                <Text style={styles.noImageText}>No Image</Text>
              )}
              <Text style={styles.mealName}>{meal.name || 'Unnamed Meal'}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noMealsText}>No meals found.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  mealsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  mealImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  mealName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noImageText: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#ddd',
    textAlign: 'center',
    lineHeight: 100,
    color: '#888',
  },
  noMealsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default UsersMeals;
