const express = require('express');
const app = express();
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();
const cookieParser = require('cookie-parser');
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


app.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('lists').get();
    const listings = snapshot.docs.map(doc => ({
      id: doc.id,      // <-- include the document ID
      ...doc.data()    // <-- spread the rest of the fields
    }));
    res.render('landingpage', { listings });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/sessionLogin', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    res.cookie('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    res.send({ message: 'Login successful' });
  } catch (error) {
    console.error('Error creating session cookie:', error);
    res.status(401).send('Unauthorized');
  }
});

// Wishlist Route
// Toggle Wishlist (Add / Remove)
app.post("/wishlist/toggle", isLoggedIn, async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: "Property ID is required" });
  }

  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userDoc = await userRef.get();

    let isSaved = false;

    if (userDoc.exists && userDoc.data().wishlist?.includes(propertyId)) {
      // REMOVE
      await userRef.update({
        wishlist: admin.firestore.FieldValue.arrayRemove(propertyId),
      });
      isSaved = false;
    } else {
      // ADD
      await userRef.set(
        {
          wishlist: admin.firestore.FieldValue.arrayUnion(propertyId),
        },
        { merge: true }
      );
      isSaved = true;
    }

    return res.json({ saved: isSaved });

  } catch (error) {
    console.error("Wishlist Toggle Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


// Show My Wishlist
app.get("/profile/wishlist", isLoggedIn, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.user.uid);
    const userDoc = await userRef.get();

    // If user has no wishlist
    if (!userDoc.exists || !userDoc.data().wishlist) {
      return res.render("wishlist", { listings: [] });
    }

    const wishlistIds = userDoc.data().wishlist;

    // Fetch all properties from "lists" collection
    const listings = [];

    for (const id of wishlistIds) {
      const propertyDoc = await db.collection("lists").doc(id).get();

      if (propertyDoc.exists) {
        listings.push({
          id: propertyDoc.id,
          ...propertyDoc.data()
        });
      }
    }

    res.render("mywishlist", { listings });

  } catch (error) {
    console.error("Fetch Wishlist Error:", error);
    res.status(500).send("Internal Server Error");
  }
});


//view route
app.get('/property/:id', async (req, res) => {
  try {
    const docRef = db.collection('lists').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send('Property not found');
    }

    const listing = { id: doc.id, ...doc.data() };

    let isWishlisted = false;

    if (req.user) {
      const userDoc = await db.collection("users").doc(req.user.uid).get();

      if (userDoc.exists && userDoc.data().wishlist) {
        isWishlisted = userDoc.data().wishlist.includes(req.params.id);
      }
    }

    res.render('view-page', { listing, isWishlisted });

  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).send('Internal Server Error');
  }
});

// profile page route
app.get('/profile', isLoggedIn, async (req, res) => {
  res.render("user_profile")
})

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
app.use((req,res)=>{
  res.status(404).send('404 Page Not Found');

});

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});