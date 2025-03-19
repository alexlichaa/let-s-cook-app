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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = () => {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => navigation.replace('Main'))
        .catch(() => setErrorMessage('Incorrect Email or Password'));
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
          <Text style={styles.title}>Login</Text>
          <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.7)"
              onChangeText={(email) => setEmail(email)}
              value={email}
              autoCapitalize="none"
          />
          <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.7)"
              onChangeText={(password) => setPassword(password)}
              value={password}
              secureTextEntry={true}
          />
          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpText}>
              Don't have an account? Sign Up
            </Text>
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
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
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
  signUpText: {
    marginTop: 10,
    color: 'black',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
