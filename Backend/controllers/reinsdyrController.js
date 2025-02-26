const Reinsdyr = require('../models/Reinsdyr');
const Flokk = require('../models/Flokk');
const Eier = require('../models/Eier');

// Create controller object
const reinsdyrController = {
  registerReinsdyr: async (req, res) => {
    try {
      const { serienummer, navn, flokkIds, hovedFlokkId, fodselsdato, eierId } = req.body;
      
      // Check if required fields are present
      if (!serienummer || !navn || !flokkIds || !hovedFlokkId || !fodselsdato) {
        return res.status(400).json({ message: 'Alle felt må fylles ut' });
      }

      // Ensure flokkIds is an array
      const flokkIdsArray = Array.isArray(flokkIds) ? flokkIds : [flokkIds];
      
      // Check if hovedFlokkId is in the flokker array
      if (!flokkIdsArray.includes(hovedFlokkId)) {
        return res.status(400).json({ message: 'Hovedflokk må være en del av flokkene' });
      }
      
      // Check if reinsdyr already exists
      const existingReinsdyr = await Reinsdyr.findOne({ serienummer });
      if (existingReinsdyr) {
        return res.status(400).json({ message: 'Reinsdyr med dette serienummeret eksisterer allerede' });
      }
      
      // Check if all flokker exist and belong to the same owner
      const flokker = await Flokk.find({ _id: { $in: flokkIdsArray } });
      
      if (flokker.length !== flokkIdsArray.length) {
        return res.status(404).json({ message: 'En eller flere flokker finnes ikke' });
      }
      
      // Check if all flokker belong to the same owner
      const eierIds = flokker.map(flokk => flokk.eier.toString());
      const uniqueEierIds = [...new Set(eierIds)];
      
      if (uniqueEierIds.length > 1) {
        return res.status(400).json({ message: 'Alle flokker må tilhøre samme eier' });
      }
      
      // Verify permissions
      const targetEierId = eierId || req.eierId;
      if (targetEierId !== uniqueEierIds[0] && !req.user.isAdmin) {
        return res.status(401).json({ 
          message: 'Du kan bare registrere reinsdyr i dine egne flokker eller med administratorrettigheter'
        });
      }
      
      // Create new reinsdyr
      const newReinsdyr = new Reinsdyr({
        serienummer,
        navn,
        flokker: flokkIdsArray,
        hovedFlokk: hovedFlokkId,
        fodselsdato: new Date(fodselsdato)
      });
      
      await newReinsdyr.save();
      
      res.status(201).json({ message: 'Reinsdyr registrert', reinsdyr: newReinsdyr });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getAllReinsdyr: async (req, res) => {
    try {
      let query = {};
      
      // If eier query parameter is provided, find all flokker for that eier first
      if (req.query.eier) {
        const flokker = await Flokk.find({ eier: req.query.eier });
        const flokkIds = flokker.map(flokk => flokk._id);
        query = { flokker: { $in: flokkIds } };
      }
      
      const reinsdyr = await Reinsdyr.find(query)
        .populate({
          path: 'flokker',
          populate: {
            path: 'eier',
            select: 'navn epost telefonnummer'
          }
        })
        .populate('hovedFlokk');
      
      res.json(reinsdyr);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getReinsdyrById: async (req, res) => {
    try {
      const reinsdyr = await Reinsdyr.findById(req.params.id)
        .populate({
          path: 'flokker',
          populate: {
            path: 'eier',
            select: 'navn epost telefonnummer'
          }
        })
        .populate('hovedFlokk');
      
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyr ikke funnet' });
      }
      
      res.json(reinsdyr);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  searchReinsdyr: async (req, res) => {
    try {
      const searchTerm = req.query.q;
      
      if (!searchTerm) {
        return res.status(400).json({ message: 'Søketerm er påkrevd' });
      }
      
      // Find reinsdyr directly matching name or serienummer
      const directMatches = await Reinsdyr.find({
        $or: [
          { serienummer: { $regex: searchTerm, $options: 'i' } },
          { navn: { $regex: searchTerm, $options: 'i' } }
        ]
      }).populate({
        path: 'flokker',
        populate: {
          path: 'eier',
          select: 'navn epost telefonnummer'
        }
      }).populate('hovedFlokk');
      
      // Find flokker with matching names
      const flokker = await Flokk.find({ 
        navn: { $regex: searchTerm, $options: 'i' } 
      });
      const flokkIds = flokker.map(flokk => flokk._id);
      
      // Find reinsdyr in those flokker
      const flokkMatches = await Reinsdyr.find({
        flokker: { $in: flokkIds }
      }).populate({
        path: 'flokker',
        populate: {
          path: 'eier',
          select: 'navn epost telefonnummer'
        }
      }).populate('hovedFlokk');
      
      // Find eiere with matching names
      const eiere = await Eier.find({ 
        navn: { $regex: searchTerm, $options: 'i' } 
      });
      const eierIds = eiere.map(eier => eier._id);
      
      // Find flokker belonging to those eiere
      const eierFlokker = await Flokk.find({ 
        eier: { $in: eierIds } 
      });
      const eierFlokkIds = eierFlokker.map(flokk => flokk._id);
      
      // Find reinsdyr in those flokker
      const eierMatches = await Reinsdyr.find({
        flokker: { $in: eierFlokkIds }
      }).populate({
        path: 'flokker',
        populate: {
          path: 'eier',
          select: 'navn epost telefonnummer'
        }
      }).populate('hovedFlokk');
      
      // Combine all results and remove duplicates
      const allResults = [...directMatches];
      
      // Add flokk matches if not already included
      for (const match of flokkMatches) {
        if (!allResults.some(r => r._id.toString() === match._id.toString())) {
          allResults.push(match);
        }
      }
      
      // Add eier matches if not already included
      for (const match of eierMatches) {
        if (!allResults.some(r => r._id.toString() === match._id.toString())) {
          allResults.push(match);
        }
      }
      
      res.json(allResults);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getUserReinsdyr: async (req, res) => {
    try {
      // Find all flokker that belong to user
      const flokker = await Flokk.find({ eier: req.eierId });
      
      if (!flokker || flokker.length === 0) {
        return res.json({
          reinsdyr: [],
          totalPages: 1,
          currentPage: 1,
          totalReinsdyr: 0
        });
      }
      
      // Get all flokk IDs
      const flokkIds = flokker.map(flokk => flokk._id);
      
      // Create the query - find reinsdyr that have any of the user's flokker
      const query = { 
        flokker: { $in: flokkIds }
      };
      
      console.log('getUserReinsdyr - Query:', JSON.stringify(query)); 
      console.log('getUserReinsdyr - User ID:', req.eierId);
      
      // Get all reinsdyr in those flokker
      const reinsdyr = await Reinsdyr.find(query)
        .populate('flokker')
        .populate('hovedFlokk')
        .sort({ createdAt: -1 });
      
      console.log(`getUserReinsdyr - Found ${reinsdyr.length} reinsdyr`);
      
      res.json({
        reinsdyr,
        totalPages: 1,
        currentPage: 1,
        totalReinsdyr: reinsdyr.length
      });
    } catch (error) {
      console.error('Error in getUserReinsdyr:', error);
      res.status(500).json({ 
        message: 'Server error', 
        errorDetails: error.message 
      });
    }
  },

  getReinsdyrByFlokk: async (req, res) => {
    try {
      const { flokkId } = req.params;
      
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Verify flokk exists
      const flokk = await Flokk.findById(flokkId).populate('eier', 'navn');
      if (!flokk) {
        return res.status(404).json({ message: 'Flokken finnes ikke' });
      }
      
      // Count total reinsdyr in this flokk
      const totalReinsdyr = await Reinsdyr.countDocuments({ flokker: flokkId });
      const totalPages = Math.ceil(totalReinsdyr / limit);
      
      // Get reinsdyr with pagination
      const reinsdyr = await Reinsdyr.find({ flokker: flokkId })
        .populate('flokker')
        .populate('hovedFlokk')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      res.json({
        reinsdyr,
        flokk,
        totalPages,
        currentPage: page,
        totalReinsdyr
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  updateReinsdyr: async (req, res) => {
    try {
      const { serienummer, navn, flokkIds, hovedFlokkId, fodselsdato, eierId } = req.body;
      
      // Find reinsdyr
      const reinsdyr = await Reinsdyr.findById(req.params.id);
      
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyr ikke funnet' });
      }
      
      // Ensure arrays
      const flokkIdsArray = flokkIds ? (Array.isArray(flokkIds) ? flokkIds : [flokkIds]) : null;
      const currentFlokkIds = reinsdyr.flokker.map(id => id.toString());
      
      // Check hovedFlokkId is in flokker array if both are being updated
      if (flokkIdsArray && hovedFlokkId && !flokkIdsArray.includes(hovedFlokkId)) {
        return res.status(400).json({ message: 'Hovedflokk må være en del av flokkene' });
      }
      
      // If only hovedFlokk is updated, check it's in the current flokker array
      if (!flokkIdsArray && hovedFlokkId && !currentFlokkIds.includes(hovedFlokkId)) {
        return res.status(400).json({ message: 'Hovedflokk må være en del av flokkene' });
      }
      
      // Check ownership
      let userCanEdit = false;
      let flokkerToCheck = flokkIdsArray || currentFlokkIds;
      
      // If user is admin, they can edit any reinsdyr
      if (req.user.isAdmin) {
        userCanEdit = true;
      } else {
        // Get user's flokker
        const userFlokker = await Flokk.find({ eier: req.eierId });
        const userFlokkIds = userFlokker.map(f => f._id.toString());
        
        // Check if user has any of the reinsdyr's flokker
        const hasAnyFlokk = currentFlokkIds.some(id => userFlokkIds.includes(id));
        
        // Check if all new flokker belong to the user
        const allNewFlokksBelongToUser = !flokkIdsArray || 
          flokkIdsArray.every(id => userFlokkIds.includes(id));
        
        userCanEdit = hasAnyFlokk && allNewFlokksBelongToUser;
      }
      
      if (!userCanEdit) {
        return res.status(401).json({ 
          message: 'Du kan bare oppdatere reinsdyr i dine egne flokker' 
        });
      }
      
      // Update fields
      if (serienummer) reinsdyr.serienummer = serienummer;
      if (navn) reinsdyr.navn = navn;
      if (flokkIdsArray) reinsdyr.flokker = flokkIdsArray;
      if (hovedFlokkId) reinsdyr.hovedFlokk = hovedFlokkId;
      if (fodselsdato) reinsdyr.fodselsdato = new Date(fodselsdato);
      
      await reinsdyr.save();
      
      res.json({ message: 'Reinsdyr oppdatert', reinsdyr });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  deleteReinsdyr: async (req, res) => {
    try {
      // Find reinsdyr
      const reinsdyr = await Reinsdyr.findById(req.params.id);
      
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyr ikke funnet' });
      }
      
      // Check if any flokk exists and belongs to the user
      const flokkIds = reinsdyr.flokker;
      const flokker = await Flokk.find({ _id: { $in: flokkIds } });
      
      // Check if user owns any of the flokker
      const userOwnsAnyFlokk = flokker.some(flokk => flokk.eier.toString() === req.eierId.toString());
      
      if (!userOwnsAnyFlokk && !req.user.isAdmin) {
        return res.status(401).json({ message: 'Du kan bare slette reinsdyr i dine egne flokker' });
      }
      
      await reinsdyr.deleteOne();
      
      res.json({ message: 'Reinsdyr slettet' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Add flokk to reinsdyr
  addFlokkToReinsdyr: async (req, res) => {
    try {
      const { reinsdyrId, flokkId } = req.body;
      
      // Find the reinsdyr
      const reinsdyr = await Reinsdyr.findById(reinsdyrId);
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyr ikke funnet' });
      }
      
      // Find the flokk
      const flokk = await Flokk.findById(flokkId);
      if (!flokk) {
        return res.status(404).json({ message: 'Flokk ikke funnet' });
      }
      
      // Check if user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString() && !req.user.isAdmin) {
        return res.status(401).json({ message: 'Du kan bare legge til reinsdyr i dine egne flokker' });
      }
      
      // Check if the reinsdyr already has this flokk
      if (reinsdyr.flokker.includes(flokkId)) {
        return res.status(400).json({ message: 'Reinsdyret er allerede i denne flokken' });
      }
      
      // Add the flokk to the reinsdyr
      reinsdyr.flokker.push(flokkId);
      
      // If reinsdyr has no hovedFlokk, set this as the hovedFlokk
      if (!reinsdyr.hovedFlokk) {
        reinsdyr.hovedFlokk = flokkId;
      }
      
      await reinsdyr.save();
      
      res.json({ message: 'Flokk lagt til reinsdyr', reinsdyr });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  // Remove flokk from reinsdyr
  removeFlokkFromReinsdyr: async (req, res) => {
    try {
      const { reinsdyrId, flokkId } = req.body;
      
      // Find the reinsdyr
      const reinsdyr = await Reinsdyr.findById(reinsdyrId);
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyr ikke funnet' });
      }
      
      // Find the flokk
      const flokk = await Flokk.findById(flokkId);
      if (!flokk) {
        return res.status(404).json({ message: 'Flokk ikke funnet' });
      }
      
      // Check if user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString() && !req.user.isAdmin) {
        return res.status(401).json({ message: 'Du kan bare fjerne reinsdyr fra dine egne flokker' });
      }
      
      // Check if the reinsdyr has this flokk
      if (!reinsdyr.flokker.includes(flokkId)) {
        return res.status(400).json({ message: 'Reinsdyret er ikke i denne flokken' });
      }
      
      // Ensure reinsdyr has at least one flokk after removal
      if (reinsdyr.flokker.length <= 1) {
        return res.status(400).json({ message: 'Reinsdyret må være i minst én flokk' });
      }
      
      // Remove the flokk from the reinsdyr
      reinsdyr.flokker = reinsdyr.flokker.filter(id => id.toString() !== flokkId);
      
      // If the removed flokk was the hovedFlokk, set a new hovedFlokk
      if (reinsdyr.hovedFlokk.toString() === flokkId) {
        reinsdyr.hovedFlokk = reinsdyr.flokker[0];
      }
      
      await reinsdyr.save();
      
      res.json({ message: 'Flokk fjernet fra reinsdyr', reinsdyr });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = reinsdyrController;