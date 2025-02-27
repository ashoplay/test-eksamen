const Transaction = require('../models/Transaction');
const Reinsdyr = require('../models/Reinsdyr');
const Flokk = require('../models/Flokk');
const Eier = require('../models/Eier');

const transactionController = {
  // Create a new transaction
  createTransaction: async (req, res) => {
    try {
      const { reinsdyrId, toEierEmail, offerText } = req.body;
  
      // Validate inputs
      if (!reinsdyrId || !toEierEmail || !offerText) {
        return res.status(400).json({ message: 'Reinsdyr ID, mottakers e-post og tilbud er påkrevd' });
      }
  
      // Find the current user (sender)
      const fromEier = await Eier.findById(req.eierId);
      if (!fromEier) {
        return res.status(404).json({ message: 'Avsender ikke funnet' });
      }
  
      // Find the recipient by email
      const toEier = await Eier.findOne({ epost: toEierEmail });
      if (!toEier) {
        return res.status(404).json({ message: 'Mottaker finnes ikke' });
      }
  
      // Find the reinsdyr
      const reinsdyr = await Reinsdyr.findById(reinsdyrId)
        .populate('flokker')
        .populate('hovedFlokk');
      
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyret finnes ikke' });
      }

      // Check reinsdyr ownership - updated for new model structure
      // Get all flokkIds from the reinsdyr
      const flokkIds = reinsdyr.flokker.map(flokk => 
        typeof flokk === 'object' ? flokk._id.toString() : flokk.toString()
      );
      
      // Find all flokker that belong to these IDs
      const flokker = await Flokk.find({ _id: { $in: flokkIds } });
      
      // Check if any of these flokker belong to the current user
      const ownsAnyFlokk = flokker.some(flokk => flokk.eier.toString() === req.eierId.toString());
      
      if (!ownsAnyFlokk) {
        return res.status(401).json({ message: 'Du eier ikke dette reinsdyret' });
      }
  
      // Prevent sending to self
      if (toEier._id.toString() === fromEier._id.toString()) {
        return res.status(400).json({ message: 'Du kan ikke sende en transaksjon til deg selv' });
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
        fromEier: fromEier._id,
        toEier: toEier._id,
        offerText: offerText,
        status: 'pending'
      });
  
      // Save and populate the transaction
      await newTransaction.save();
      await newTransaction.populate([
        { path: 'fromEier', select: 'navn epost' },
        { path: 'toEier', select: 'navn epost' },
        { path: 'reinsdyr', select: 'navn serienummer fodselsdato' }
      ]);
  
      res.status(201).json({ 
        message: 'Transaksjonsforespørsel sendt', 
        transaction: newTransaction 
      });
    } catch (error) {
      console.error('Error in createTransaction:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
  
  // Get all transactions for the current user
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
      .sort({ createdAt: -1 });
  
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
      const reinsdyr = await Reinsdyr.findById(transaction.reinsdyr._id);
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyret finnes ikke lenger' });
      }

      // Check reinsdyr ownership - updated for new model structure
      // Get all flokkIds from the reinsdyr
      const flokkIds = reinsdyr.flokker.map(flokk => 
        typeof flokk === 'object' ? flokk._id.toString() : flokk.toString()
      );
      
      // Find all flokker that belong to these IDs
      const flokker = await Flokk.find({ _id: { $in: flokkIds } });
      
      // Check if any of these flokker belong to the current user
      const ownsAnyFlokk = flokker.some(flokk => flokk.eier.toString() === req.eierId.toString());
      
      if (!ownsAnyFlokk) {
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
            serieinndeling: flokker.length > 0 ? flokker[0].serieinndeling : 'A',
            buemerke_navn: `${transaction.toEier.navn}s Buemerke`,
            beiteomrade: flokker.length > 0 ? flokker[0].beiteomrade : null // Use the same beiteomrade for now
          });
          await newFlokk.save();
          targetFlokkId = newFlokk._id;
        }
      }

      // Transfer the reinsdyr - updated for new model structure
      reinsdyr.flokker = [targetFlokkId]; // Replace all flokker with just the target flokk
      reinsdyr.hovedFlokk = targetFlokkId; // Set the target flokk as the hovedFlokk
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
      const reinsdyr = await Reinsdyr.findById(reinsdyrId);
      if (!reinsdyr) {
        return res.status(404).json({ message: 'Reinsdyret finnes ikke' });
      }

      // Verify current user owns the reinsdyr by checking ownership of any flokk
      const flokkIds = reinsdyr.flokker.map(f => typeof f === 'object' ? f._id.toString() : f.toString());
      const flokker = await Flokk.find({ _id: { $in: flokkIds } });
      const ownsAnyFlokk = flokker.some(flokk => flokk.eier.toString() === req.eierId.toString());

      if (!ownsAnyFlokk) {
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

      // Check if the reinsdyr is already in this flokk and it's the only one
      if (flokkIds.length === 1 && flokkIds[0] === targetFlokkId) {
        return res.status(400).json({ message: 'Reinsdyret er allerede i denne flokken og har ingen andre flokker' });
      }

      // Update reinsdyr's flokker and hovedFlokk
      // Add to flokker array if not already there
      if (!flokkIds.includes(targetFlokkId)) {
        reinsdyr.flokker.push(targetFlokkId);
      }
      
      // Set as hovedFlokk
      reinsdyr.hovedFlokk = targetFlokkId;
      
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