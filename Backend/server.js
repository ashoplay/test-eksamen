const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const initializeData = require('./config/dataInit');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const reinsdyrRoutes = require('./routes/reinsdyrRoutes');
const eierRoutes = require('./routes/eierRoutes');
const beiteomradeRoutes = require('./routes/beiteomradeRoutes');
const flokkRoutes = require('./routes/flokkRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Load environment variables
dotenv.config();

// Connect to database and initialize data
connectDB().then(() => {
  initializeData();
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

// Static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Routes for views
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/reinsdyr', (req, res) => {
  res.render('reinsdyr');
});

app.get('/flokk', (req, res) => {
  res.render('flokk');
});

app.get('/eiere', (req, res) => {
  res.render('eiere');
});

app.get('/eiere/:id', (req, res) => {
  res.render('eier-profile');
});

app.get('/nettverkskart', (req, res) => {
  res.render('nettverkskart');
});

app.get('/faq', (req, res) => {
  res.render('faq');
});

app.get('/kart', (req, res) => {
  res.render('kart');
});

app.get('/databaseinfo', (req, res) => {
  res.render('databaseinfo');
});
app.get('/flokk/:id/reinsdyr', (req, res) => {
  res.render('flokk-reinsdyr');
});

app.get('/transactions', (req, res) => {
  res.render('transactions');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reinsdyr', reinsdyrRoutes);
app.use('/api/eier', eierRoutes);
app.use('/api/beiteomrade', beiteomradeRoutes);
app.use('/api/flokk', flokkRoutes);
app.use('/api/transaction', transactionRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT}`);
});