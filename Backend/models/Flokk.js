const mongoose = require('mongoose');

const FlokkSchema = new mongoose.Schema({
  navn: {
    type: String,
    required: true
  },
  eier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Eier',
    required: true
  },
  serieinndeling: {
    type: String,
    required: true
  },
  buemerke_navn: {
    type: String,
    required: true
  },
  buemerke_bilde: {
    type: String,  // URL to image or base64 encoded string
    default: 'default_buemerke.png'
  },
  beiteomrade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beiteomrade',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Flokk', FlokkSchema);