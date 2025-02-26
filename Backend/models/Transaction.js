const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  reinsdyr: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reinsdyr',
    required: true
  },
  fromEier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Eier',
    required: true
  },
  toEier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Eier',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted_by_receiver', 'rejected_by_receiver', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);