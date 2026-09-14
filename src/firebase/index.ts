'use client';

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAJI3YTcodxsDQQfJAZCPtqhYGyOfDVj2E',
  authDomain: 'oryon-txuna-bet-38430222-8acbd.firebaseapp.com',
  projectId: 'oryon-txuna-bet-38430222-8acbd',
  storageBucket: 'oryon-txuna-bet-38430222-8acbd.firebasestorage.app',
  messagingSenderId: '210744998871',
  appId: '1:210744998871:web:7b169fac311a2a3bf8a992',
  firestoreDatabaseId: 'ai-studio-2b79dc9e-3208-4bf9-9db8-90474595d2d7',
} as const;

const clientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

const firestoreDatabaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId;

function hasClientConfig(config: FirebaseOptions): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function initializeFirebase() {
  if (!hasClientConfig(clientConfig)) {
    throw new Error('Firebase web configuration is incomplete.');
  }

  const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(clientConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp, firestoreDatabaseId),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
