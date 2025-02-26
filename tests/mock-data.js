/**
 * Mock Data Generator for Reinsdyr Registration System
 * This script generates sample data for testing and demonstration.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/models/User');
const Eier = require('../backend/models/Eier');
const Flokk = require('../backend/models/Flokk');
const Reinsdyr = require('../backend/models/Reinsdyr');
const Beiteomrade = require('../backend/models/Beiteomrade');
const Transaction = require('../backend/models/Transaction');

// Configuration
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reinsdyrdb';

// Sample data
const users = [
  {
    username: 'user1',
    password: 'Password1!',
    isAdmin: false,
  },
  {
    username: 'user2',
    password: 'Password2!',
    isAdmin: false,
  },
  {
    username: 'admin',
    password: 'AdminPass1!',
    isAdmin: true,
  }
];

const eiere = [
  {
    navn: 'Anders Andersen',
    epost: 'anders@example.com',
    kontaktsprak: 'Nordsamisk',
    telefonnummer: '11111111'
  },
  {
    navn: 'Berit Berentsen',
    epost: 'berit@example.com',
    kontaktsprak: 'Sørsamisk',
    telefonnummer: '22222222'
  }
];

const beiteomrader = [
  {
    navn: 'Nordsamisk',
    fylker: ['Troms og Finnmark', 'Nordland']
  },
  {
    navn: 'Sørsamisk',
    fylker: ['Trøndelag', 'Innlandet']
  },
  {
    navn: 'Lulesamisk',
    fylker: ['Nordland']
  }
];

// Clear database and generate new data
async function resetAndGenerate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected...');
    
    // Clear all collections
    await User.deleteMany({});
    await Eier.deleteMany({});
    await Flokk.deleteMany({});
    await Reinsdyr.deleteMany({});
    await Transaction.deleteMany({});
    
    // Only create beiteomrader if they don't exist
    const beiteomradeCount = await Beiteomrade.countDocuments();
    if (beiteomradeCount === 0) {
      await Beiteomrade.deleteMany({});
      const createdBeiteomrader = await Beiteomrade.insertMany(beiteomrader);
      console.log(`${createdBeiteomrader.length} beiteomrader created`);
    } else {
      console.log(`${beiteomradeCount} beiteomrader already exist, skipping creation`);
    }
    
    // Get beiteomrader for reference
    const allBeiteomrader = await Beiteomrade.find();
    
    // Create users and eiere
    for (let i = 0; i < users.length - 1; i++) {
      const user = users[i];
      const eier = eiere[i];
      
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Create eier
      const newEier = new Eier({
        ...eier
      });
      await newEier.save();
      
      // Create user
      const newUser = new User({
        ...user,
        password: hashedPassword,
        eier: newEier._id
      });
      await newUser.save();
      
      // Link eier to user
      newEier.user = newUser._id;
      await newEier.save();
      
      console.log(`Created user ${user.username} with eier ${eier.navn}`);
      
      // Create flokker for each eier
      const flokker = [];
      for (let j = 0; j < 2; j++) {
        const flokk = new Flokk({
          navn: `${eier.navn}s Flokk ${j + 1}`,
          eier: newEier._id,
          serieinndeling: String.fromCharCode(65 + j), // A, B, etc.
          buemerke_navn: `${eier.navn}s Buemerke ${j + 1}`,
          buemerke_bilde: 'default_buemerke.png',
          beiteomrade: allBeiteomrader[Math.floor(Math.random() * allBeiteomrader.length)]._id
        });
        await flokk.save();
        flokker.push(flokk);
        console.log(`Created flokk ${flokk.navn}`);
      }
      
      // Create reinsdyr for each flokk
      for (const flokk of flokker) {
        for (let k = 0; k < 12; k++) {
          const reinsdyr = new Reinsdyr({
            serienummer: `${flokk.serieinndeling}${k + 1}`.padStart(4, '0'),
            navn: `Reinsdyr ${flokk.serieinndeling}${k + 1}`,
            flokk: flokk._id,
            fodselsdato: new Date(2018 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
          });
          await reinsdyr.save();
        }
        console.log(`Created 12 reinsdyr for flokk ${flokk.navn}`);
      }
    }
    
    // Create admin user
    const admin = users[users.length - 1];
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const adminUser = new User({
      ...admin,
      password: hashedPassword
    });
    await adminUser.save();
    console.log(`Created admin user ${admin.username}`);
    
    // Generate some transactions
    const allEiere = await Eier.find();
    const allReinsdyr = await Reinsdyr.find();
    
    if (allEiere.length >= 2 && allReinsdyr.length > 0) {
      // Create a pending transaction
      const pendingTransaction = new Transaction({
        reinsdyr: allReinsdyr[0]._id,
        fromEier: allEiere[0]._id,
        toEier: allEiere[1]._id,
        status: 'pending'
      });
      await pendingTransaction.save();
      console.log('Created a pending transaction');
      
      // Create an accepted transaction
      const acceptedTransaction = new Transaction({
        reinsdyr: allReinsdyr[1]._id,
        fromEier: allEiere[0]._id,
        toEier: allEiere[1]._id,
        status: 'accepted_by_receiver'
      });
      await acceptedTransaction.save();
      console.log('Created an accepted transaction');
      
      // Create a completed transaction
      const completedTransaction = new Transaction({
        reinsdyr: allReinsdyr[2]._id,
        fromEier: allEiere[0]._id,
        toEier: allEiere[1]._id,
        status: 'confirmed',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      });
      await completedTransaction.save();
      console.log('Created a completed transaction');
    }
    
    console.log('Mock data generation complete!');
  } catch (error) {
    console.error('Error generating mock data:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the generator if this is called directly
if (require.main === module) {
  console.log('Starting mock data generation...');
  resetAndGenerate()
    .then(() => console.log('Done!'))
    .catch(err => console.error('Error:', err));
}

module.exports = { resetAndGenerate };