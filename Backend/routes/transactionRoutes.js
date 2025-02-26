const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect, owner } = require('../middleware/authMiddleware');

// Create a new transaction
router.post('/', protect, owner, transactionController.createTransaction);

// Get all transactions for the current user
router.get('/my', protect, owner, transactionController.getUserTransactions);

// Get a specific transaction
router.get('/:transactionId', protect, owner, transactionController.getTransaction);

// Accept a transaction (receiver)
router.put('/:transactionId/accept', protect, owner, transactionController.acceptTransaction);

// Reject a transaction (receiver)
router.put('/:transactionId/reject', protect, owner, transactionController.rejectTransaction);

// Confirm a transaction (sender - final step)
router.put('/:transactionId/confirm', protect, owner, transactionController.confirmTransaction);

// Cancel a transaction (sender)
router.put('/:transactionId/cancel', protect, owner, transactionController.cancelTransaction);

// Transfer between flokker (internal transfer)
router.post('/transfer-internal', protect, owner, transactionController.transferBetweenFlokker);

module.exports = router;