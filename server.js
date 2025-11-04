const express = require('express');
const app = express();
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

app.use(express.static(path.join(__dirname, 'public')));
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


//view route
app.get('/property/:id', async (req, res) => {
  try {
    const docRef = db.collection('lists').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send('Property not found');
    }

    const listing = { id: doc.id, ...doc.data() };
    res.render('view-page', { listing });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).send('Internal Server Error');
  }
});



//authentication route
app.get('/auth', (req, res) => {
  res.render('login-page', { title: 'Login' });
});

//404 route
app.use((req,res)=>{
  res.send('404 Page Not Found');
});

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});