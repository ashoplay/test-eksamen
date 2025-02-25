const mongoose = require('mongoose');

const BeiteomradeSchema = new mongoose.Schema({
  navn: {
    type: String,
    required: true,
    enum: [
      'Nordsamisk', 
      'Sørsamisk', 
      'Lulesamisk', 
      'Pitesamisk', 
      'Umesamisk', 
      'Skoltesamisk',
      'Enaresamisk',
      'Kildinsamisk',
      'Tersamisk',
      'Akkalasamisk',
      'Kemisamisk'
    ]
  },
  fylker: {
    type: [String],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Beiteomrade', BeiteomradeSchema);