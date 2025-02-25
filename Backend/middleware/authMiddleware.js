const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  // Check for token in cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  // Check for token in Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Ikke autorisert, ingen token' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set user in req
    req.user = await User.findById(decoded.id).select('-password');
    
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Ikke autorisert, ugyldig token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: 'Ikke autorisert som administrator' });
  }
};

const owner = (req, res, next) => {
  if (req.user && req.user.eier) {
    req.eierId = req.user.eier;
    next();
  } else {
    res.status(401).json({ message: 'Ikke autorisert som eier' });
  }
};

module.exports = { protect, admin, owner };