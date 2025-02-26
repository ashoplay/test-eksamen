const Transaction = require('../models/Transaction');
const Reinsdyr = require('../models/Reinsdyr');
const Flokk = require('../models/Flokk');
const Eier = require('../models/Eier');

const transactionController = {
  // Create a new transaction
  createTransaction: async (req, res) => {
    try {
      const { reinsdyrId, toEierEmail } = req.body;

      // Validate inputs
      if (!reinsdyrId || !toEierEmail) {
        return res.status(400).json({ message: 'Reinsdyr ID og mottakers e-post er påkrevd' });
      }

      // Find the reinsdyr
      const reinsdyr = await Reinsdyr.findById(reinsdyrId).populate('flokk');
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyret finnes ikke' });
      }

      // Verify the current user owns the reinsdyr
      const flokk = await Flokk.findById(reinsdyr.flokk);
      if (!flokk) {
        return res.status(404).json({ message: 'Flokken finnes ikke' });
      }

      if (flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare overføre dine egne reinsdyr' });
      }

      // Find the recipient by email
      const toEier = await Eier.findOne({ epost: toEierEmail });
      if (!toEier) {
        return res.status(404).json({ message: 'Mottaker finnes ikke' });
      }

      // Cannot transfer to self
      if (toEier._id.toString() === req.eierId.toString()) {
        return res.status(400).json({ message: 'Du kan ikke overføre til deg selv. Bruk intern overføring for å flytte reinsdyr mellom egne flokker.' });
      }

      // Check if there's already a pending transaction for this reindeer
      const existingTransaction = await Transaction.findOne({ 
        reinsdyr: reinsdyrId, 
        status: { $in: ['pending', 'accepted_by_receiver'] }
      });

      if (existingTransaction) {
        return res.status(400).json({ message: 'Det finnes allerede en aktiv transaksjon for dette reinsdyret' });
      }

      // Create the transaction
      const newTransaction = new Transaction({
        reinsdyr: reinsdyrId,
        fromEier: req.eierId,
        toEier: toEier._id,
        status: 'pending'
      });

      await newTransaction.save();

      res.status(201).json({ 
        message: 'Transaksjonen er opprettet. Venter på godkjenning fra mottaker.',
        transaction: newTransaction
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all transactions for the current user (both as sender and receiver)
  getUserTransactions: async (req, res) => {
    try {
      const transactions = await Transaction.find({
        $or: [
          { fromEier: req.eierId },
          { toEier: req.eierId }
        ]
      })
      .populate('reinsdyr')
      .populate('fromEier', 'navn epost')
      .populate('toEier', 'navn epost')
      .sort('-createdAt');

      res.json(transactions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Accept transaction by receiver
  acceptTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;

      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaksjonen finnes ikke' });
      }

      // Verify the current user is the receiver
      if (transaction.toEier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare akseptere transaksjoner der du er mottaker' });
      }

      // Check if transaction is in the correct state
      if (transaction.status !== 'pending') {
        return res.status(400).json({ message: 'Transaksjonen kan ikke aksepteres i nåværende tilstand' });
      }

      // Update transaction status
      transaction.status = 'accepted_by_receiver';
      await transaction.save();

      res.json({ 
        message: 'Transaksjonen er akseptert. Venter på endelig bekreftelse fra avsender.',
        transaction
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Reject transaction by receiver
  rejectTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;

      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaksjonen finnes ikke' });
      }

      // Verify the current user is the receiver
      if (transaction.toEier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare avslå transaksjoner der du er mottaker' });
      }

      // Check if transaction is in the correct state
      if (transaction.status !== 'pending') {
        return res.status(400).json({ message: 'Transaksjonen kan ikke avslås i nåværende tilstand' });
      }

      // Update transaction status
      transaction.status = 'rejected_by_receiver';
      await transaction.save();

      res.json({ 
        message: 'Transaksjonen er avslått.',
        transaction
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Confirm transaction (final step by sender)
  confirmTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;
      const { flokkId } = req.body; // Optional: which flokk to transfer the reinsdyr to

      // Find the transaction
      const transaction = await Transaction.findById(transactionId)
        .populate('reinsdyr')
        .populate('toEier');
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaksjonen finnes ikke' });
      }

      // Verify the current user is the sender
      if (transaction.fromEier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare bekrefte transaksjoner der du er avsender' });
      }

      // Check if transaction is in the correct state
      if (transaction.status !== 'accepted_by_receiver') {
        return res.status(400).json({ message: 'Transaksjonen kan ikke bekreftes i nåværende tilstand' });
      }

      // Find the reinsdyr and confirm it still belongs to the sender
      const reinsdyr = await Reinsdyr.findById(transaction.reinsdyr._id).populate('flokk');
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyret finnes ikke lenger' });
      }

      const flokk = await Flokk.findById(reinsdyr.flokk);
      if (!flokk || flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du eier ikke lenger dette reinsdyret' });
      }

      // Find or create a flokk for the recipient if flokkId is not provided
      let targetFlokkId;
      if (flokkId) {
        // Verify that the flokk belongs to the recipient
        const targetFlokk = await Flokk.findById(flokkId);
        if (!targetFlokk || targetFlokk.eier.toString() !== transaction.toEier._id.toString()) {
          return res.status(400).json({ message: 'Ugyldig målflokk' });
        }
        targetFlokkId = flokkId;
      } else {
        // Find the first flokk belonging to the recipient or create a default one
        const targetFlokk = await Flokk.findOne({ eier: transaction.toEier._id });
        if (targetFlokk) {
          targetFlokkId = targetFlokk._id;
        } else {
          // Create a new default flokk for the recipient
          const newFlokk = new Flokk({
            navn: 'Standard Flokk',
            eier: transaction.toEier._id,
            serieinndeling: flokk.serieinndeling,
            buemerke_navn: `${transaction.toEier.navn}s Buemerke`,
            beiteomrade: flokk.beiteomrade // Use the same beiteomrade for now
          });
          await newFlokk.save();
          targetFlokkId = newFlokk._id;
        }
      }

      // Transfer the reinsdyr
      reinsdyr.flokk = targetFlokkId;
      await reinsdyr.save();

      // Update transaction status
      transaction.status = 'confirmed';
      await transaction.save();

      res.json({ 
        message: 'Transaksjonen er fullført. Reinsdyret er overført til ny eier.',
        transaction,
        reinsdyr
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Cancel transaction (by sender)
  cancelTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;

      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaksjonen finnes ikke' });
      }

      // Verify the current user is the sender
      if (transaction.fromEier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare kansellere transaksjoner der du er avsender' });
      }

      // Check if transaction is in a state that can be cancelled
      if (!['pending', 'accepted_by_receiver'].includes(transaction.status)) {
        return res.status(400).json({ message: 'Transaksjonen kan ikke kanselleres i nåværende tilstand' });
      }

      // Update transaction status
      transaction.status = 'cancelled';
      await transaction.save();

      res.json({ 
        message: 'Transaksjonen er kansellert.',
        transaction
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Transfer reinsdyr between flokker (same owner)
  transferBetweenFlokker: async (req, res) => {
    try {
      const { reinsdyrId, targetFlokkId } = req.body;

      // Validate inputs
      if (!reinsdyrId || !targetFlokkId) {
        return res.status(400).json({ message: 'Reinsdyr ID og målflokk ID er påkrevd' });
      }

      // Find the reinsdyr
      const reinsdyr = await Reinsdyr.findById(reinsdyrId).populate('flokk');
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyret finnes ikke' });
      }

      // Verify current user owns the reinsdyr
      const flokk = await Flokk.findById(reinsdyr.flokk);
      if (!flokk || flokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare overføre dine egne reinsdyr' });
      }

      // Verify target flokk exists and belongs to current user
      const targetFlokk = await Flokk.findById(targetFlokkId);
      if (!targetFlokk) {
        return res.status(404).json({ message: 'Målflokken finnes ikke' });
      }

      if (targetFlokk.eier.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du kan bare overføre til dine egne flokker' });
      }

      // Cannot transfer to the same flokk
      if (reinsdyr.flokk._id.toString() === targetFlokkId) {
        return res.status(400).json({ message: 'Reinsdyret er allerede i denne flokken' });
      }

      // Transfer the reinsdyr
      reinsdyr.flokk = targetFlokkId;
      await reinsdyr.save();

      res.json({ 
        message: 'Reinsdyret er overført til ny flokk.',
        reinsdyr
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get transaction details
  getTransaction: async (req, res) => {
    try {
      const { transactionId } = req.params;

      const transaction = await Transaction.findById(transactionId)
        .populate('reinsdyr')
        .populate('fromEier', 'navn epost')
        .populate('toEier', 'navn epost');

      if (!transaction) {
        return res.status(404).json({ message: 'Transaksjonen finnes ikke' });
      }

      // Verify the current user is either sender or receiver
      if (transaction.fromEier._id.toString() !== req.eierId.toString() && 
          transaction.toEier._id.toString() !== req.eierId.toString()) {
        return res.status(401).json({ message: 'Du har ikke tilgang til denne transaksjonen' });
      }

      res.json(transaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = transactionController;