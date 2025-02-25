const mongoose = require('mongoose');

const ReinsdyrSchema = new mongoose.Schema({
  serienummer: {
    type: String,
    required: true,
    unique: true
  },
  navn: {
    type: String,
    required: true
  },
  flokk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flokk',
    required: true
  },
  fodselsdato: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reinsdyr', ReinsdyrSchema);