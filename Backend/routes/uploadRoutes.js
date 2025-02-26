
const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/uploadMiddleware');
const { protect, owner } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');

// Route for uploading buemerke images
router.post('/buemerke', protect, owner, upload.single('buemerke_bilde'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Ingen fil lastet opp' });
    }
    
    // Return the file path
    const filePath = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'Fil lastet opp',
      filePath
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Feil under opplasting av fil' });
  }
});


module.exports = router;