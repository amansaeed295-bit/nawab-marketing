// // ============================================================
// // NAWAB MARKETING — Firebase / Firestore connection
// // Looks for the Firebase Admin SDK service-account JSON next to server.js.
// // IMPORTANT: never commit/share this key publicly.
// // ============================================================
// const fs = require('fs');
// const path = require('path');
// const admin = require('firebase-admin');

// let db = null;

// function findServiceAccount() {
//   if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//     const p = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
//     if (fs.existsSync(p)) return p;
//   }

//   // Supports the key shown in the project folder, e.g.
//   // nawab-marketing-firebase-adminsdk-xxxxx.json
//   const files = fs.readdirSync(__dirname);
//   const key = files.find(f =>
//     f.toLowerCase().endsWith('.json') &&
//     f.toLowerCase().includes('firebase-adminsdk') &&
//     f !== 'package.json'
//   );
//   return key ? path.join(__dirname, key) : null;
// }

// function initFirebase() {
//   if (db) return db;

//   const keyPath = findServiceAccount();

//   try {
//     if (keyPath) {
//       const serviceAccount = require(keyPath);
//       admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount)
//       });
//       console.log('✓ Firebase Admin connected.');
//       console.log('✓ Firestore project:', serviceAccount.project_id || '(project id hidden)');
//     } else {
//       // Also supports GOOGLE_APPLICATION_CREDENTIALS / Google-hosted environments.
//       admin.initializeApp();
//       console.log('✓ Firebase Admin initialized with application/default credentials.');
//     }
//     db = admin.firestore();
//     return db;
//   } catch (err) {
//     console.error('✗ Firebase initialization failed:', err.message);
//     return null;
//   }
// }

// const COLLECTION = 'nawab_marketing_data';

// const FILE_TO_DOC = {
//   'messages.json': 'messages',
//   'projects.json': 'projects',
//   'services.json': 'services',
//   'testimonials.json': 'testimonials',
//   'team.json': 'team',
//   'settings.json': 'settings'
// };

// async function loadDocument(fileName, fallback) {
//   const firestore = initFirebase();
//   if (!firestore) return fallback;

//   const docName = FILE_TO_DOC[fileName];
//   if (!docName) return fallback;

//   try {
//     const snap = await firestore.collection(COLLECTION).doc(docName).get();
//     if (snap.exists) {
//       const value = snap.data().value;
//       if (value !== undefined) return value;
//     }

//     // First run: migrate the existing local JSON into Firestore.
//     await firestore.collection(COLLECTION).doc(docName).set({
//       value: fallback,
//       migratedAt: new Date().toISOString()
//     });
//     console.log(`✓ Seeded Firestore: ${docName}`);
//     return fallback;
//   } catch (err) {
//     console.error(`Firestore read failed (${docName}):`, err.message);
//     return fallback;
//   }
// }

// async function saveDocument(fileName, value) {
//   const firestore = initFirebase();
//   if (!firestore) return false;

//   const docName = FILE_TO_DOC[fileName];
//   if (!docName) return false;

//   try {
//     await firestore.collection(COLLECTION).doc(docName).set({
//       value,
//       updatedAt: new Date().toISOString()
//     }, { merge: true });
//     return true;
//   } catch (err) {
//     console.error(`Firestore write failed (${docName}):`, err.message);
//     return false;
//   }
// }

// module.exports = { initFirebase, loadDocument, saveDocument };


// ============================================================
// NAWAB MARKETING — Firebase / Firestore connection
// Supports:
// 1. FIREBASE_SERVICE_ACCOUNT_JSON (Render / production)
// 2. GOOGLE_APPLICATION_CREDENTIALS (optional)
// 3. Local Firebase Admin SDK JSON (local development)
//
// IMPORTANT: never commit/share the Firebase service-account key.
// ============================================================

// ============================================================
// NAWAB MARKETING — Firebase / Firestore connection
// Supports Render production environment variable and
// local Firebase Admin SDK JSON.
// ============================================================

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let db = null;

function findServiceAccount() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const p = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (fs.existsSync(p)) {
      return p;
    }
  }

  const files = fs.readdirSync(__dirname);

  const key = files.find(function (f) {
    return (
      f.toLowerCase().endsWith('.json') &&
      f.toLowerCase().includes('firebase-adminsdk') &&
      f !== 'package.json'
    );
  });

  return key ? path.join(__dirname, key) : null;
}

function initFirebase() {
  if (db) return db;

  const keyPath = findServiceAccount();

  try {
    // Render / production
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      let serviceAccount;

      try {
        serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        );
      } catch (parseError) {
        console.error(
          '✗ FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.'
        );
        return null;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log(
        '✓ Firebase Admin connected via environment variable.'
      );

      console.log(
        '✓ Firestore project:',
        serviceAccount.project_id || '(project id hidden)'
      );
    }

    // Local development
    else if (keyPath) {
      const serviceAccount = require(keyPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('✓ Firebase Admin connected.');

      console.log(
        '✓ Firestore project:',
        serviceAccount.project_id || '(project id hidden)'
      );
    }

    // Google-hosted / default credentials
    else {
      admin.initializeApp();

      console.log(
        '✓ Firebase Admin initialized with application/default credentials.'
      );
    }

    db = admin.firestore();

    return db;

  } catch (err) {
    console.error(
      '✗ Firebase initialization failed:',
      err.message
    );

    return null;
  }
}

const COLLECTION = 'nawab_marketing_data';

const FILE_TO_DOC = {
  'messages.json': 'messages',
  'projects.json': 'projects',
  'services.json': 'services',
  'testimonials.json': 'testimonials',
  'team.json': 'team',
  'settings.json': 'settings'
};

async function loadDocument(fileName, fallback) {
  const firestore = initFirebase();

  if (!firestore) return fallback;

  const docName = FILE_TO_DOC[fileName];

  if (!docName) return fallback;

  try {
    const snap = await firestore
      .collection(COLLECTION)
      .doc(docName)
      .get();

    if (snap.exists) {
      const value = snap.data().value;

      if (value !== undefined) {
        return value;
      }
    }

    await firestore
      .collection(COLLECTION)
      .doc(docName)
      .set({
        value: fallback,
        migratedAt: new Date().toISOString()
      });

    console.log(
      '✓ Seeded Firestore: ' + docName
    );

    return fallback;

  } catch (err) {
    console.error(
      'Firestore read failed (' + docName + '):',
      err.message
    );

    return fallback;
  }
}

async function saveDocument(fileName, value) {
  const firestore = initFirebase();

  if (!firestore) return false;

  const docName = FILE_TO_DOC[fileName];

  if (!docName) return false;

  try {
    await firestore
      .collection(COLLECTION)
      .doc(docName)
      .set(
        {
          value: value,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    return true;

  } catch (err) {
    console.error(
      'Firestore write failed (' + docName + '):',
      err.message
    );

    return false;
  }
}

module.exports = {
  initFirebase,
  loadDocument,
  saveDocument
};