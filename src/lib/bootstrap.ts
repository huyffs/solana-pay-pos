import { PUBLIC_FIREBASE_CONFIG } from '$env/static/public';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(JSON.parse(PUBLIC_FIREBASE_CONFIG));
export const auth = getAuth();
export const db = getFirestore(app);
