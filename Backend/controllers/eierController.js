const Eier = require('../models/Eier');

const eierController = {
  getEierById: async (req, res) => {
    try {
      const eier = await Eier.findById(req.params.id);
      
      if (!eier) {
        return res.status(404).json({ message: 'Eier ikke funnet' });
      }
      
      res.json(eier);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getAllEiere: async (req, res) => {
    try {
      const eiere = await Eier.find();
      res.json(eiere);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getMe: async (req, res) => {
    try {
      const eier = await Eier.findById(req.eierId);
      
      if (!eier) {
        return res.status(404).json({ message: 'Eier ikke funnet' });
      }
      
      res.json(eier);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  updateEier: async (req, res) => {
    try {
      const { navn, epost, kontaktsprak, telefonnummer } = req.body;
      
      // Ensure only the owner can update their information
      if (req.params.id !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Ikke autorisert til å oppdatere denne eieren' });
      }
      
      const eier = await Eier.findById(req.params.id);
      
      if (!eier) {
        return res.status(404).json({ message: 'Eier ikke funnet' });
      }
      
      // Update fields
      if (navn) eier.navn = navn;
      if (epost) eier.epost = epost;
      if (kontaktsprak) eier.kontaktsprak = kontaktsprak;
      if (telefonnummer) eier.telefonnummer = telefonnummer;
      
      await eier.save();
      
      res.json({ message: 'Eier oppdatert', eier });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  searchEiere: async (req, res) => {
    try {
      const searchTerm = req.query.q || '';
      
      // Build the search query
      let query = {};
      
      // If a search term is provided, use it for filtering
      if (searchTerm.trim() !== '') {
        query = {
          $or: [
            { navn: { $regex: searchTerm, $options: 'i' } },
            { epost: { $regex: searchTerm, $options: 'i' } },
            { telefonnummer: { $regex: searchTerm, $options: 'i' } }
          ]
        };
      }
      
      // Get eiere
      const eiere = await Eier.find(query).select('navn epost telefonnummer kontaktsprak');
      
      res.json(eiere);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = eierController;