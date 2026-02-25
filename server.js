const express = require('express');
const app = express();
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const wrapAsync = require('./utils/wrapAsync');
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'assets')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(expressLayouts);
app.set('layout', 'layouts/boilerplate');

// Firebase Admin SDK setup
const admin = require('firebase-admin');
const serviceAccount = require('./stayhub-1-firebase-adminsdk-fbsvc-be2e49ff02.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware to make user available in all views
const authenticateUser = async (req, res, next) => {
  const sessionCookie = req.cookies?.session;
  if (!sessionCookie) {
    req.user = null;
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = decodedToken;
  } catch (err) {
    req.user = null;
  }

  next();
};

app.use(authenticateUser);

app.use((req, res, next) => {
  res.locals.user = req.user; // now available in all EJS templates
  next();
});

const isLoggedIn = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/auth');
  }
  next();
};


// Make Firebase Web config available to all EJS views
app.use((req, res, next) => {
  res.locals.firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
  next();
});


app.get('/', wrapAsync(async (req, res) => {
  const snapshot = await db.collection('lists').get();
  const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.render('landingpage', { listings });
}));

app.post('/sessionLogin', wrapAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).send('Unauthorized');

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const expiresIn = 30 * 60 * 1000;

  const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

  res.cookie('session', sessionCookie, {
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });

  const userRef = db.collection("users").doc(decodedToken.uid);

  let username = decodedToken.name?.trim() || `Guest${Math.floor(10000 + Math.random() * 90000)}`;

  await userRef.set({
    name: username,
    email: decodedToken.email,
    photoURL: decodedToken.picture || "",
    role: "guest",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  res.send({ message: 'Login successful' });
}));

// Wishlist Route
// Toggle Wishlist (Add / Remove)
app.post("/wishlist/toggle", isLoggedIn, wrapAsync(async (req, res) => {
  const { propertyId } = req.body;
  if (!propertyId) return res.status(400).json({ error: "Property ID is required" });

  const userRef = db.collection("users").doc(req.user.uid);
  const userDoc = await userRef.get();
  let isSaved = false;

  if (userDoc.exists && userDoc.data().wishlist?.includes(propertyId)) {
    await userRef.update({ wishlist: admin.firestore.FieldValue.arrayRemove(propertyId) });
    isSaved = false;
  } else {
    await userRef.set({ wishlist: admin.firestore.FieldValue.arrayUnion(propertyId) }, { merge: true });
    isSaved = true;
  }

  res.json({ saved: isSaved });
}));


// Show My Wishlist
app.get("/profile/wishlist", isLoggedIn, wrapAsync(async (req, res) => {
  const userRef = db.collection("users").doc(req.user.uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists || !userDoc.data().wishlist) {
    return res.render("mywishlist", { listings: [] });
  }

  const wishlistIds = userDoc.data().wishlist;
  const listings = [];

  for (const id of wishlistIds) {
    const propertyDoc = await db.collection("lists").doc(id).get();
    if (propertyDoc.exists) {
      listings.push({ id: propertyDoc.id, ...propertyDoc.data() });
    }
  }

  res.render("mywishlist", { listings });
}));



//view route
app.get('/property/:id', wrapAsync(async (req, res) => {
  const docRef = db.collection('lists').doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).send('Property not found');

  const listing = { id: doc.id, ...doc.data() };
  let isWishlisted = false;

  if (req.user) {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (userDoc.exists && userDoc.data().wishlist) {
      isWishlisted = userDoc.data().wishlist.includes(req.params.id);
    }
  }

  res.render('view-page', { listing, isWishlisted });
}));

// profile page route

app.get('/profile', isLoggedIn, wrapAsync(async (req, res) => {
  const userRef = db.collection("users").doc(req.user.uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};
  const bookings = []; // placeholder
  res.render("user_profile", { user: userData, bookings });
}));
app.post("/profile/update", isLoggedIn, wrapAsync(async (req, res) => {
  const { name, phone, bio } = req.body;
  await db.collection("users").doc(req.user.uid).set({
    name: name || "",
    phone: phone || "",
    bio: bio || "",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  res.redirect("/profile");
}));

// Example: Profile Photo Update
app.post("/profile/update-photo", isLoggedIn, wrapAsync(async (req, res) => {
  const { photoURL } = req.body;

  await db.collection("users").doc(req.user.uid).set({
    photoURL,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await admin.auth().updateUser(req.user.uid, { photoURL });

  res.json({ success: true });
}));

// Host Dashboard (Partners Page)
app.get('/partners', isLoggedIn, wrapAsync(async (req, res) => {
  // Fetch properties listed by this host
  const snapshot = await db.collection('lists')
    .where('hostId', '==', req.user.uid)
    .orderBy('createdAt', 'desc')
    .get();

  const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Optionally, count total bookings, etc.
  // const bookingsSnapshot = await db.collection('bookings')
  //   .where('hostId', '==', req.user.uid)
  //   .get();
  // const totalBookings = bookingsSnapshot.size;

  res.render('partners_landing_page', { user: req.user, properties });
}));

//authentication route
app.get('/auth', (req, res) => {
  res.render('login-page', { title: 'Login' });
});

//logout route
app.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/');
});

//404 route
app.use((req, res) => {
  res.status(404).send('404 Page Not Found');

});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  if (req.headers['content-type']?.includes('application/json')) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  res.status(500).send('Something went wrong! Please try again later.');
});


app.listen(8080, () => {
  console.log('Server is running on port 8080');
});