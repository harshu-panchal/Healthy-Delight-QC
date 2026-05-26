import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "dummy-api-key") {
    try {
        app = initializeApp(firebaseConfig);

        isSupported().then((supported) => {
            if (supported && app) {
                analytics = getAnalytics(app);
            }
        }).catch((err) => {
            console.debug('Firebase Analytics initialization skipped or blocked:', err);
        });

        try {
            messaging = getMessaging(app);
        } catch (error: any) {
            console.warn('Firebase Messaging not supported in this environment.', error);
        }
    } catch (error) {
        console.error('Failed to initialize Firebase app:', error);
    }
} else {
    console.info('ℹ️ Firebase credentials are not configured or are set to dummy values in .env. Skipping initialization.');
}

export { messaging, getToken, onMessage };
export default app;
