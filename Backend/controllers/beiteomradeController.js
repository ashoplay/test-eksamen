const Beiteomrade = require('../models/Beiteomrade');

const beiteomradeController = {
  registerBeiteomrade: async (req, res) => {
    try {
      const { navn, fylker } = req.body;
      
      // Check if required fields are present
      if (!navn || !fylker || !Array.isArray(fylker) || fylker.length === 0) {
        return res.status(400).json({ message: 'Navn og fylker er påkrevd' });
      }
      
      // Check if beiteomrade already exists
      const existingBeiteomrade = await Beiteomrade.findOne({ navn });
      if (existingBeiteomrade) {
        return res.status(400).json({ message: 'Beiteområde med dette navnet eksisterer allerede' });
      }
      
      // Create new beiteomrade
      const newBeiteomrade = new Beiteomrade({
        navn,
        fylker
      });
      
      await newBeiteomrade.save();
      
      res.status(201).json({ message: 'Beiteområde registrert', beiteomrade: newBeiteomrade });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getAllBeiteomrader: async (req, res) => {
    try {
      const beiteomrader = await Beiteomrade.find();
      res.json(beiteomrader);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },
  
  getBeiteomradeById: async (req, res) => {
    try {
      const beiteomrade = await Beiteomrade.findById(req.params.id);
      
      if (!beiteomrade) {
        return res.status(404).json({ message: 'Beiteområde ikke funnet' });
      }
      
      res.json(beiteomrade);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = beiteomradeController;