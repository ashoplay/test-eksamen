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
const uploadRoutes = require('./routes/uploadRoutes');
const fs = require('fs');


dotenv.config();

// Connect to db
connectDB().then(() => {
  initializeData();
});

const app = express();


const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [`http://${process.env.DOMAIN}`, `https://${process.env.DOMAIN}`] 
    : 'http://localhost:5000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));


app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes views
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


app.use('/api/auth', authRoutes);
app.use('/api/reinsdyr', reinsdyrRoutes);
app.use('/api/eier', eierRoutes);
app.use('/api/beiteomrade', beiteomradeRoutes);
app.use('/api/flokk', flokkRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/upload', uploadRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'En feil har oppstått på serveren', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.use('/tests', express.static(path.join(__dirname, '../tests')));
  console.log('Test routes enabled - access at /tests/functional-tests.js');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT} i ${process.env.NODE_ENV || 'development'} modus`);
  console.log(`MongoDB URI: ${process.env.MONGO_URI || 'mongodb://localhost:27017/reinsdyrdb'}`);
});
