import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD7KvpFez2PTxOI0VQLfYBiGE0Y-oNzIe4",
  authDomain: "zoveai.firebaseapp.com",
  projectId: "zoveai",
  storageBucket: "zoveai.firebasestorage.app",
  messagingSenderId: "177436773946",
  appId: "1:177436773946:web:273d7f990f556469056f03"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseAuth = getAuth(app);
export default app;
