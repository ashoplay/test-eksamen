const express = require('express');
const router = express.Router();
const flokkController = require('../controllers/flokkController');
const { protect, owner } = require('../middleware/authMiddleware');

router.post('/', protect, owner, flokkController.registerFlokk);
router.get('/', flokkController.getAllFlokker);
router.get('/my', protect, owner, flokkController.getUserFlokker);
router.get('/:id', flokkController.getFlokkById);
router.put('/:id', protect, owner, flokkController.updateFlokk);
router.delete('/:id', protect, owner, flokkController.deleteFlokk);

module.exports = router;