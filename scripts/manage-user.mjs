import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const allowedRoles = new Set([
  "Admin (Apoteker)",
  "Petugas Farmasi",
  "Petugas Jaringan",
  "Petugas Unit"
]);

function printUsage() {
  console.log(`
Pemakaian:
  node --env-file=.env.local scripts/manage-user.mjs create-user --email <email> --password <password> --name <nama> --role <role>
  node --env-file=.env.local scripts/manage-user.mjs set-password --email <email> --password <password>

Role yang valid:
  - Admin (Apoteker)
  - Petugas Farmasi
  - Petugas Jaringan
  - Petugas Unit
`);
}

function getFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function ensureEnv() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Env Firebase server belum lengkap. Pastikan .env.local sudah benar.");
  }
}

function getAdminApp() {
  ensureEnv();

  return getApps().length
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

async function createUserCommand() {
  const email = getFlag("--email");
  const password = getFlag("--password");
  const name = getFlag("--name");
  const role = getFlag("--role");
  const facilityId = getFlag("--facility-id") ?? "";
  const facilityName = getFlag("--facility-name") ?? "";

  if (!email || !password || !name || !role) {
    throw new Error("create-user butuh --email, --password, --name, dan --role.");
  }

  if (!allowedRoles.has(role)) {
    throw new Error(`Role "${role}" tidak valid.`);
  }

  const app = getAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    userRecord = await auth.updateUser(userRecord.uid, {
      password,
      displayName: name
    });
  } catch {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true
    });
  }

  await auth.setCustomUserClaims(userRecord.uid, { role });
  await db.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    name,
    role,
    facilityId,
    facilityName,
    active: true,
    createdAt: new Date().toISOString()
  });

  console.log(`Berhasil menyimpan user ${email}`);
  console.log(`UID: ${userRecord.uid}`);
  console.log(`Role: ${role}`);
}

async function setPasswordCommand() {
  const email = getFlag("--email");
  const password = getFlag("--password");

  if (!email || !password) {
    throw new Error("set-password butuh --email dan --password.");
  }

  const app = getAdminApp();
  const auth = getAuth(app);
  const userRecord = await auth.getUserByEmail(email);

  await auth.updateUser(userRecord.uid, { password });

  console.log(`Password berhasil diganti untuk ${email}`);
  console.log(`UID: ${userRecord.uid}`);
}

async function main() {
  const command = process.argv[2];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  if (command === "create-user") {
    await createUserCommand();
    return;
  }

  if (command === "set-password") {
    await setPasswordCommand();
    return;
  }

  throw new Error(`Perintah "${command}" tidak dikenali.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
});
