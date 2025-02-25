const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const EierSchema = new mongoose.Schema({
  navn: {
    type: String,
    required: true
  },
  uniktNummer: {
    type: String,
    default: uuidv4,
    unique: true
  },
  epost: {
    type: String,
    required: true,
    unique: true
  },
  kontaktsprak: {
    type: String,
    required: true,
    enum: ['Nordsamisk', 'Sørsamisk', 'Lulesamisk', 'Pitesamisk', 'Umesamisk', 'Skoltesamisk']
  },
  telefonnummer: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Eier', EierSchema);