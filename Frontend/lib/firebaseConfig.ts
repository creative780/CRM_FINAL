import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCVTRBDsHwC-RKPuFBw0xtpQweAEomWN78",
  authDomain: "creativeprintscrm.firebaseapp.com",
  projectId: "creativeprintscrm",
  storageBucket: "creativeprintscrm.appspot.com",
  messagingSenderId: "890698255554",
  appId: "1:890698255554:web:43a6db60b93e6dd6c37f5b",
  measurementId: "G-VBW1N9CFJR",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // ✅ Firestore instance

export { auth, provider, db };
