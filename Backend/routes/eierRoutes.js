const express = require('express');
const router = express.Router();
const eierController = require('../controllers/eierController');
const { protect, owner, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, eierController.getAllEiere);
router.get('/me', protect, owner, eierController.getMe);
router.get('/search', eierController.searchEiere);
router.get('/:id', protect, eierController.getEierById);
router.put('/:id', protect, owner, eierController.updateEier);

module.exports = router;