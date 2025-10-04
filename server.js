const express = require('express');
const app = express();
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

app.use(express.static(path.join(__dirname, 'public')));
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

app.get('/lp', (req, res) => {
  res.render('landingpage', { 
    title: 'Home' });
});

app.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('lists').get();
    const listings = snapshot.docs.map(doc => doc.data());
    res.render('landingpage', { listings });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/landing-page', (req, res) => {
  res.render('landingpage', { title: 'Home' });  // Fixed here, removed the 'views/' prefix
});


app.get('/login-page', (req, res) => {
  res.render('login-page', { title: 'Login' });
});

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});