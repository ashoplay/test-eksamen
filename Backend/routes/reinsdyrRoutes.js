const express = require('express');
const router = express.Router();
const reinsdyrController = require('../controllers/reinsdyrController');
const { protect, owner } = require('../middleware/authMiddleware');

// Base CRUD routes
router.post('/', protect, owner, reinsdyrController.registerReinsdyr);
router.get('/', reinsdyrController.getAllReinsdyr);
router.get('/search', reinsdyrController.searchReinsdyr);
router.get('/my', protect, owner, reinsdyrController.getUserReinsdyr);
router.get('/:id', reinsdyrController.getReinsdyrById);
router.put('/:id', protect, owner, reinsdyrController.updateReinsdyr);
router.delete('/:id', protect, owner, reinsdyrController.deleteReinsdyr);
router.get('/flokk/:flokkId', reinsdyrController.getReinsdyrByFlokk);

// Routes for managing multiple flokker
router.post('/add-flokk', protect, owner, reinsdyrController.addFlokkToReinsdyr);
router.post('/remove-flokk', protect, owner, reinsdyrController.removeFlokkFromReinsdyr);

module.exports = router;