const express = require('express');
const router = express.Router();
const beiteomradeController = require('../controllers/beiteomradeController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/', protect, admin, beiteomradeController.registerBeiteomrade);
router.get('/', beiteomradeController.getAllBeiteomrader);
router.get('/:id', beiteomradeController.getBeiteomradeById);

module.exports = router;