import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const FAMILY_PASSWORD =
  import.meta.env.VITE_FAMILY_PASSWORD || '123456'

/** Nurhat profil şifresi (Gizem şifresiz girer) */
export const NURHAT_PIN = import.meta.env.VITE_NURHAT_PIN || '2580'

export const GROUP_ID = import.meta.env.VITE_GROUP_ID || 'aile'

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) &&
  firebaseConfig.apiKey !== 'demo' &&
  firebaseConfig.projectId !== 'demo'

let app: FirebaseApp | null = null
let db: Firestore | null = null

export function getDb(): Firestore {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase henüz yapılandırılmadı. .env dosyasını doldurun.')
  }
  if (!app) {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
  }
  return db!
}
