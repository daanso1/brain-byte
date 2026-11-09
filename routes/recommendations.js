const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../controllers/recommendationsController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getRecommendations);

module.exports = router;
