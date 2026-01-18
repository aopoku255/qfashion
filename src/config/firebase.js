const admin = require("firebase-admin");
const serviceAccount = require("./firebase/firebase-service.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const bucket = admin.storage().bucket("qfashion-a0dcc.firebasestorage.app");

module.exports = { admin, bucket };

// {
//   apiKey: "AIzaSyAqehpa-37xNnb_U1qOTW66Ig2AtxG18p0",
//   authDomain: "qfashion-ccce1.firebaseapp.com",
//   projectId: "qfashion-ccce1",
//   storageBucket: "qfashion-ccce1.firebasestorage.app",
//   messagingSenderId: "787105899318",
//   appId: "1:787105899318:web:ecf91956e5299d52c98997"
// };
