const Beiteomrade = require('../models/Beiteomrade');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Initialize database with required data
 */
const initializeData = async () => {
  try {
    // Check if beiteområder already exist
    const beiteomradeCount = await Beiteomrade.countDocuments();
    
    if (beiteomradeCount === 0) {
      console.log('Initializing default beiteområder...');
      
      // Create default beiteområder
      const beiteomrader = [
        {
          navn: 'Nordsamisk',
          fylker: ['Troms og Finnmark', 'Nordland', 'Trøndelag']
        },
        {
          navn: 'Sørsamisk',
          fylker: ['Trøndelag', 'Innlandet', 'Nordland']
        },
        {
          navn: 'Lulesamisk',
          fylker: ['Nordland']
        },
        {
          navn: 'Pitesamisk',
          fylker: ['Nordland']
        },
        {
          navn: 'Umesamisk',
          fylker: ['Nordland']
        },
        {
          navn: 'Skoltesamisk',
          fylker: ['Troms og Finnmark']
        },
        {
          navn: 'Enaresamisk',
          fylker: ['Troms og Finnmark (grenseområde)']
        },
        {
          navn: 'Kildinsamisk',
          fylker: ['Russland (grenseområde)']
        },
        {
          navn: 'Tersamisk',
          fylker: ['Russland (grenseområde)']
        },
        {
          navn: 'Akkalasamisk',
          fylker: ['Finland (grenseområde)']
        },
        {
          navn: 'Kemisamisk',
          fylker: ['Finland (grenseområde)']
        }
      ];
      
      await Beiteomrade.insertMany(beiteomrader);
      console.log('Default beiteområder created successfully.');
    }
    
    // Check if admin user exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      console.log('Creating admin user...');
      
      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      const adminUser = new User({
        username: 'admin',
        password: hashedPassword,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully.');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

module.exports = initializeData;