
const mongoose = require('mongoose');
require('dotenv').config();

async function migrateReinsdyr() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find all reinsdyr that have the old schema
    const oldReinsdyr = await mongoose.connection.db.collection('reinsdyrs').find({
      flokk: { $exists: true },
      flokker: { $exists: false }
    }).toArray();
    
    console.log(`Found ${oldReinsdyr.length} reinsdyr with old schema`);
    
    // Update each reinsdyr
    for (const r of oldReinsdyr) {
      console.log(`Migrating reinsdyr ${r.serienummer}`);
      
      await mongoose.connection.db.collection('reinsdyrs').updateOne(
        { _id: r._id },
        { 
          $set: {
            flokker: [r.flokk],
            hovedFlokk: r.flokk
          }
        }
      );
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateReinsdyr();