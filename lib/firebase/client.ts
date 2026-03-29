"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from "firebase/firestore";
import { firebaseClientConfig, isFirebaseClientConfigured } from "@/lib/firebase/config";

let clientApp: FirebaseApp | undefined;
let clientAuth: Auth | undefined;
let clientDb: Firestore | undefined;

export function getFirebaseClientApp() {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase client environment belum lengkap.");
  }

  if (!clientApp) {
    clientApp = getApps().length ? getApp() : initializeApp(firebaseClientConfig);
  }

  return clientApp;
}

export function getFirebaseClientAuth() {
  if (!clientAuth) {
    clientAuth = getAuth(getFirebaseClientApp());
  }

  return clientAuth;
}

export function getFirebaseClientDb() {
  if (!clientDb) {
    const app = getFirebaseClientApp();

    try {
      clientDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      clientDb = getFirestore(app);
    }
  }

  return clientDb;
}

