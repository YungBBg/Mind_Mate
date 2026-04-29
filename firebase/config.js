import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';  
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import 'firebase/auth';



// #region agent log
const LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/33114d42-979c-4d97-877c-8d11e9a9c894';
const log = (location, message, data, hypothesisId) => {
  fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId }) }).catch(() => {});
};
// #endregion

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAHV1sD533A8eZIbonTi7hUFb22BP1_vU",
  authDomain: "yungtest-4e9bb.firebaseapp.com",
  databaseURL: "https://yungtest-4e9bb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "yungtest-4e9bb",
  storageBucket: "yungtest-4e9bb.firebasestorage.app",
  messagingSenderId: "781307485554",
  appId: "1:781307485554:web:b8fc724c2f80e2794dd1eb",
  measurementId: "G-0XQJRS8YJC"
};


// Initialize Firebase App
// #region agent log
log('firebase/config.js:28', 'Initializing Firebase App', { appsCount: getApps().length }, 'H4');
// #endregion
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
// #region agent log
log('firebase/config.js:32', 'Firebase App initialized', { appId: app?.options?.appId }, 'H4');
// #endregion

const auth = initializeAuth(app);

// Initialize Realtime Database
const database = getDatabase(app);
const db = getFirestore(app);

export { app, auth, database, db };
