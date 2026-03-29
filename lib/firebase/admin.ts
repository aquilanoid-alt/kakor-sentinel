import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { isFirebaseServerConfigured } from "@/lib/firebase/config";

let adminApp: App | undefined;

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp() {
  if (!isFirebaseServerConfigured()) {
    throw new Error("Firebase server environment belum lengkap.");
  }

  if (!adminApp) {
    adminApp = getApps().length
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: getPrivateKey()
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
  }

  return adminApp;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

