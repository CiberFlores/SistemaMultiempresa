import { initializeApp, getApps } from "firebase/app";
import { browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { appInstalada } from "../../utils/instalacionApp";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = getApps().find((item) => item.name === "[DEFAULT]") || initializeApp(firebaseConfig);
// En el navegador la sesión dura lo que dure la pestaña. Solo la app instalada la recuerda.
export const PERSISTENCIA = appInstalada() ? [indexedDBLocalPersistence, browserLocalPersistence] : browserSessionPersistence;
const auth = initializeAuth(app, { persistence: PERSISTENCIA });
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
