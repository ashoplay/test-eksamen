const Reinsdyr = require('../models/Reinsdyr');
const Flokk = require('../models/Flokk');
const Eier = require('../models/Eier');

const reinsdyrController = {
  registerReinsdyr: async (req, res) => {
    try {
      const { serienummer, navn, flokkId, fodselsdato } = req.body;
      
      // Check if required fields are present
      if (!serienummer || !navn || !flokkId || !fodselsdato) {
        return res.status(400).json({ message: 'Alle felt må fylles ut' });
      }
      
      // Check if reinsdyr already exists
      const existingReinsdyr = await Reinsdyr.findOne({ serienummer });
      if (existingReinsdyr) {
        return res.status(400).json({ message: 'Reinsdyr med dette serienummeret eksisterer allerede' });
      }
      
      // Check if flokk exists and belongs to the user
      const flokk = await Flokk.findById(flokkId);
      if (!flokk) {
        return res.status(404).json({ message: 'Flokken finnes ikke' });
      }
      
      // Verify that the user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare registrere reinsdyr i dine egne flokker' });
      }
      
      // Create new reinsdyr
      const newReinsdyr = new Reinsdyr({
        serienummer,
        navn,
        flokk: flokkId,
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
        query = { flokk: { $in: flokkIds } };
      }
      
      const reinsdyr = await Reinsdyr.find(query)
        .populate({
          path: 'flokk',
          populate: {
            path: 'eier',
            select: 'navn epost telefonnummer'
          }
        });
      
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
          path: 'flokk',
          populate: {
            path: 'eier',
            select: 'navn epost telefonnummer'
          }
        });
      
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
        path: 'flokk',
        populate: {
          path: 'eier',
          select: 'navn epost telefonnummer'
        }
      });
      
      // Find flokker with matching names
      const flokker = await Flokk.find({ 
        navn: { $regex: searchTerm, $options: 'i' } 
      });
      const flokkIds = flokker.map(flokk => flokk._id);
      
      // Find reinsdyr in those flokker
      const flokkMatches = await Reinsdyr.find({
        flokk: { $in: flokkIds }
      }).populate({
        path: 'flokk',
        populate: {
          path: 'eier',
          select: 'navn epost telefonnummer'
        }
      });
      
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
        flokk: { $in: eierFlokkIds }
      }).populate({
        path: 'flokk',
        populate: {
          path: 'eier',
          select: 'navn epost telefonnummer'
        }
      });
      
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
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Optional flokk filter
      const flokkFilter = req.query.flokkId ? { flokk: req.query.flokkId } : {};
      
      // Find all flokker that belong to user
      const flokker = await Flokk.find({ eier: req.eierId });
      
      if (!flokker || flokker.length === 0) {
        return res.json({
          reinsdyr: [],
          totalPages: 0,
          currentPage: page,
          totalReinsdyr: 0
        });
      }
      
      // Get all flokk IDs
      const flokkIds = flokker.map(flokk => flokk._id);
      
      // Create the query
      const query = { 
        flokk: flokkFilter.flokk || { $in: flokkIds }
      };
      
      console.log('Query:', JSON.stringify(query)); // Debug log
      
      // Get total count for pagination
      const totalReinsdyr = await Reinsdyr.countDocuments(query);
      const totalPages = Math.ceil(totalReinsdyr / limit);
      
      // Get all reinsdyr in those flokker with pagination
      const reinsdyr = await Reinsdyr.find(query)
        .populate('flokk')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      console.log(`Found ${reinsdyr.length} reinsdyr out of ${totalReinsdyr} total`); // Debug log
      
      res.json({
        reinsdyr,
        totalPages,
        currentPage: page,
        totalReinsdyr
      });
    } catch (error) {
      console.error('Error in getUserReinsdyr:', error);
      res.status(500).json({ message: 'Server error' });
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
      const totalReinsdyr = await Reinsdyr.countDocuments({ flokk: flokkId });
      const totalPages = Math.ceil(totalReinsdyr / limit);
      
      // Get reinsdyr with pagination
      const reinsdyr = await Reinsdyr.find({ flokk: flokkId })
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
      const { serienummer, navn, flokkId, fodselsdato } = req.body;
      
      // Find reinsdyr
      const reinsdyr = await Reinsdyr.findById(req.params.id);
      
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyr ikke funnet' });
      }
      
      // Check if flokk exists and belongs to the user
      const flokk = await Flokk.findById(reinsdyr.flokk);
      if (!flokk) {
        return res.status(404).json({ message: 'Flokken finnes ikke' });
      }
      
      // Verify that the user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare oppdatere reinsdyr i dine egne flokker' });
      }
      
      // If changing flokk, verify the new flokk belongs to the user
      if (flokkId && flokkId !== flokk._id.toString()) {
        const newFlokk = await Flokk.findById(flokkId);
        if (!newFlokk) {
          return res.status(404).json({ message: 'Ny flokk finnes ikke' });
        }
        
        if (newFlokk.eier.toString() !== req.eierId.toString()) {
          return res.status(401).json({ message: 'Du kan bare flytte reinsdyr til dine egne flokker' });
        }
      }
      
      // Update fields
      if (serienummer) reinsdyr.serienummer = serienummer;
      if (navn) reinsdyr.navn = navn;
      if (flokkId) reinsdyr.flokk = flokkId;
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
      
      // Check if flokk exists and belongs to the user
      const flokk = await Flokk.findById(reinsdyr.flokk);
      if (!flokk) {
        return res.status(404).json({ message: 'Flokken finnes ikke' });
      }
      
      // Verify that the user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare slette reinsdyr i dine egne flokker' });
      }
      
      await reinsdyr.deleteOne();
      
      res.json({ message: 'Reinsdyr slettet' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = reinsdyrController;