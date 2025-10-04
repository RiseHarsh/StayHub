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

app.get('/', (req, res) => {
  res.render('layouts/boilerplate', { 
    title: 'Home',
    body: `
      <div class="text-center">
        <h1 class="mt-5">Welcome to StayHub</h1>
        <p class="lead">This is just a test page for the navbar and footer.</p>
        <a href="/features" class="btn btn-primary mt-3">Go to Features</a>
      </div>
    `
  });
});


app.listen(8080, () => {
  console.log('Server is running on port 8080');
});