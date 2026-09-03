import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: 'AIzaSyDXbLvZYDYdGJspgCwymFiHRyPBiHHdY4g',
  projectId: 'iot1-d86f0',
  storageBucket: 'iot1-d86f0.firebasestorage.app',
  messagingSenderId: '38213246262',
  databaseURL: 'https://iot1-d86f0-default-rtdb.asia-southeast1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
