
import firebase from 'firebase';
// DO NOT import storage explicitly

const firebaseConfig = {
  apiKey: "AIzaSyA_kK2-Io9rshIpYyk4tMke7zte0KONN8U",
  authDomain: "travel-companion-1af66.firebaseapp.com",
  projectId: "travel-companion-1af66",
  storageBucket: "travel-companion-1af66.appspot.com",
  messagingSenderId: "20251275382",
  appId: "1:20251275382:web:fd8b6f1dafc56b0cccaf57",
  measurementId: "G-F8BQK88PRM"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;