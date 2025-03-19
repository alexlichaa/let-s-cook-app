import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import firebase from '../firebaseconfig';

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !username) {
      setErrorMessage('Please fill out all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }

    try {
      // Use Firebase v8 syntax
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const userId = userCredential.user.uid;
      const defaultProfilePhotoUrl =
          'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/noprofile.jpg?alt=media&token=ec31ea3a-27e9-4621-9d43-fe55b086caa0';

      // Save user info in Firestore
      await firebase.firestore().collection('USERSinfo').doc(userId).set({
        email,
        username,
        profilePhoto: defaultProfilePhotoUrl,
      });

      navigation.replace('Preferences');
    } catch (error) {
      console.error('Error during signup:', error);
      setErrorMessage(error.message);
    }
  };

  return (
      <ImageBackground
          source={{
            uri: 'https://firebasestorage.googleapis.com/v0/b/travel-companion-1af66.appspot.com/o/loginWallpaper.JPG?alt=media&token=abf30d7a-8b5d-4b62-ac9e-818180b75c84',
          }}
          style={styles.backgroundImage}
          imageStyle={{ opacity: 0.2 }}
      >
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>Sign Up</Text>
          <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.7)"
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
          />
          <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.7)"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
          />
          <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="rgba(255,255,255,0.7)"
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              secureTextEntry
          />
          <TextInput
              style={styles.input}
              placeholder="Username"
              onChangeText={setUsername}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={username}
          />
          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signUpText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: 'black',
  },
  input: {
    paddingHorizontal: 10,
    marginVertical: 10,
    width: 250,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    color: 'white',
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  signUpText: {
    marginTop: 10,
    color: 'black',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 20,
    alignItems: 'center',
    width: 150,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SignUpScreen;
