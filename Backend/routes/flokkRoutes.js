const express = require('express');
const router = express.Router();
const flokkController = require('../controllers/flokkController');
const { protect, owner } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Add this route to handle image uploads
router.post('/', protect, owner, upload.single('buemerke_bilde'), flokkController.registerFlokk);
router.put('/:id', protect, owner, upload.single('buemerke_bilde'), flokkController.updateFlokk);

// Update the registerFlokk and updateFlokk methods in flokkController.js

// Updated registerFlokk method
const registerFlokk = async (req, res) => {
  try {
    const { navn, serieinndeling, buemerke_navn, beiteomradeId } = req.body;
    
    // Check if required fields are present
    if (!navn || !serieinndeling || !buemerke_navn || !beiteomradeId) {
      return res.status(400).json({ message: 'Alle felt må fylles ut' });
    }
    
    // Check if beiteomrade exists
    const beiteomrade = await Beiteomrade.findById(beiteomradeId);
    if (!beiteomrade) {
      return res.status(404).json({ message: 'Beiteområdet finnes ikke' });
    }
    
    // Get the file path if an image was uploaded
    let buemerke_bilde = 'default_buemerke.png';
    if (req.file) {
      buemerke_bilde = `uploads/${req.file.filename}`;
    }
    
    // Create new flokk
    const newFlokk = new Flokk({
      navn,
      eier: req.eierId,
      serieinndeling,
      buemerke_navn,
      buemerke_bilde,
      beiteomrade: beiteomradeId
    });
    
    await newFlokk.save();
    
    res.status(201).json({ message: 'Flokk registrert', flokk: newFlokk });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Updated updateFlokk method
const updateFlokk = async (req, res) => {
  try {
    const { navn, serieinndeling, buemerke_navn, beiteomradeId } = req.body;
    
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
    if (beiteomradeId) flokk.beiteomrade = beiteomradeId;
    
    // Update buemerke_bilde if a new image was uploaded
    if (req.file) {
      flokk.buemerke_bilde = `uploads/${req.file.filename}`;
    }
    
    await flokk.save();
    
    res.json({ message: 'Flokk oppdatert', flokk });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}