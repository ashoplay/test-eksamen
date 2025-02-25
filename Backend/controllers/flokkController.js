const Flokk = require('../models/Flokk');
const Beiteomrade = require('../models/Beiteomrade');
const Reinsdyr = require('../models/Reinsdyr');

const flokkController = {
  registerFlokk: async (req, res) => {
    try {
      const { navn, serieinndeling, buemerke_navn, buemerke_bilde, beiteomradeId } = req.body;
      
      // Check if required fields are present
      if (!navn || !serieinndeling || !buemerke_navn || !beiteomradeId) {
        return res.status(400).json({ message: 'Alle felt må fylles ut' });
      }
      
      // Check if beiteomrade exists
      const beiteomrade = await Beiteomrade.findById(beiteomradeId);
      if (!beiteomrade) {
        return res.status(404).json({ message: 'Beiteområdet finnes ikke' });
      }
      
      // Create new flokk
      const newFlokk = new Flokk({
        navn,
        eier: req.eierId,
        serieinndeling,
        buemerke_navn,
        buemerke_bilde: buemerke_bilde || 'default_buemerke.png',
        beiteomrade: beiteomradeId
      });
      
      await newFlokk.save();
      
      res.status(201).json({ message: 'Flokk registrert', flokk: newFlokk });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getAllFlokker: async (req, res) => {
    try {
      // If eier query parameter is provided, filter by eier
      const filter = req.query.eier ? { eier: req.query.eier } : {};
      
      const flokker = await Flokk.find(filter)
        .populate('eier', 'navn epost telefonnummer')
        .populate('beiteomrade', 'navn fylker');
      
      res.json(flokker);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getFlokkById: async (req, res) => {
    try {
      const flokk = await Flokk.findById(req.params.id)
        .populate('eier', 'navn epost telefonnummer')
        .populate('beiteomrade', 'navn fylker');
      
      if (!flokk) {
        return res.status(404).json({ message: 'Flokk ikke funnet' });
      }
      
      res.json(flokk);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getUserFlokker: async (req, res) => {
    try {
      const flokker = await Flokk.find({ eier: req.eierId })
        .populate('beiteomrade', 'navn fylker');
      
      res.json(flokker);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  updateFlokk: async (req, res) => {
    try {
      const { navn, serieinndeling, buemerke_navn, buemerke_bilde, beiteomradeId } = req.body;
      
      // Find the flokk
      const flokk = await Flokk.findById(req.params.id);
      
      if (!flokk) {
        return res.status(404).json({ message: 'Flokk ikke funnet' });
      }
      
      // Check if user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Ikke autorisert til å oppdatere denne flokken' });
      }
      
      // Check if beiteomrade exists if provided
      if (beiteomradeId) {
        const beiteomrade = await Beiteomrade.findById(beiteomradeId);
        if (!beiteomrade) {
          return res.status(404).json({ message: 'Beiteområdet finnes ikke' });
        }
      }
      
      // Update fields
      if (navn) flokk.navn = navn;
      if (serieinndeling) flokk.serieinndeling = serieinndeling;
      if (buemerke_navn) flokk.buemerke_navn = buemerke_navn;
      if (buemerke_bilde) flokk.buemerke_bilde = buemerke_bilde;
      if (beiteomradeId) flokk.beiteomrade = beiteomradeId;
      
      await flokk.save();
      
      res.json({ message: 'Flokk oppdatert', flokk });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  deleteFlokk: async (req, res) => {
    try {
      // Find the flokk
      const flokk = await Flokk.findById(req.params.id);
      
      if (!flokk) {
        return res.status(404).json({ message: 'Flokk ikke funnet' });
      }
      
      // Check if user owns the flokk
      if (flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Ikke autorisert til å slette denne flokken' });
      }
      
      // Check if there are reinsdyr in the flokk
      const reinsdyrCount = await Reinsdyr.countDocuments({ flokk: flokk._id });
      
      if (reinsdyrCount > 0) {
        return res.status(400).json({ 
          message: 'Kan ikke slette flokken fordi det er reinsdyr i den. Flytt eller slett reinsdyrene først.' 
        });
      }
      
      await flokk.remove();
      
      res.json({ message: 'Flokk slettet' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = flokkController;