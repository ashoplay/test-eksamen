const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Eier = require('../models/Eier');

const authController = {
  register: async (req, res) => {
    try {
      const { username, password, navn, epost, kontaktsprak, telefonnummer } = req.body;
      
      // Check if required fields are present
      if (!username || !password || !navn || !epost || !kontaktsprak || !telefonnummer) {
        return res.status(400).json({ message: 'Alle felt må fylles ut' });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Brukernavn er allerede i bruk' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new eier
      const newEier = new Eier({
        navn,
        epost,
        kontaktsprak,
        telefonnummer
      });
      
      await newEier.save();
      
      // Create new user
      const newUser = new User({
        username,
        password: hashedPassword,
        eier: newEier._id
      });
      
      // Link user to eier
      newEier.user = newUser._id;
      await newEier.save();
      
      await newUser.save();
      
      res.status(201).json({ message: 'Bruker registrert' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Check if required fields are present
      if (!username || !password) {
        return res.status(400).json({ message: 'Brukernavn og passord er påkrevd' });
      }
      
      // Find user
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: 'Feil brukernavn eller passord' });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Feil brukernavn eller passord' });
      }
      
      // Check if JWT_SECRET is set
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing");
        return res.status(500).json({ message: 'Server error: Missing JWT secret' });
      }
      
      // Generate token
      const token = jwt.sign(
        { 
          id: user._id,
          isAdmin: user.isAdmin,
          eierId: user.eier
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1d' }
      );
      
      // Set HTTP only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      res.json({ 
        token,
        user: {
          id: user._id,
          username: user.username,
          isAdmin: user.isAdmin,
          eierId: user.eier
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getMe: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'Bruker ikke funnet' });
      }
      
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  logout: (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logget ut' });
  }
};

module.exports = authController;