import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Animated,
  StyleSheet,
  View,
  ImageBackground,
  Text,
  Image,
} from 'react-native';
import LoginScreen from './HomeScreen/Login';
import SignUpScreen from './HomeScreen/Signup';
import ProfileScreen from './MainCategories/Profile';
import PreferencesScreen from './MainCategories/Preferences';
import RecipesData from './components/Recipes';
import FilterIngredientData from './components/FilterIngredient';
import FilterCalorieData from './components/FilterByCalories';
import UsersMeals from './components/UsersMeals';
import MainScreen from './Main';
import firebase from './firebaseconfig';

console.log("✅ Firebase initialized successfully!");

const Stack = createStackNavigator();

// Splash screen component - shown briefly before moving to Login
const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Navigate to Login after 2 seconds instead of Main
    setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
  }, []);

  return (
    <ImageBackground
      source={{
        uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/AppBackground.jpeg?alt=media&token=ff5e6fc2-e72f-4d8c-a469-633d4b8430bd',
      }}
      style={styles.background}
      resizeMode="cover"
      imageStyle={{ opacity: 0.3 }}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Image
          source={{
            uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/RecipeAppLogo.jpg?alt=media&token=ce30dd7c-21af-4308-8a98-3da9219c1407',
          }}
          style={styles.logo}
        />
        <Text style={styles.appName}>Let's Cook</Text>
      </Animated.View>
    </ImageBackground>
  );
};

export default () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Recipes"
          component={RecipesData}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FilterIngredient"
          component={FilterIngredientData}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FilterByCalories"
          component={FilterCalorieData}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UsersMeals"
          component={UsersMeals}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
});