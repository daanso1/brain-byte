const express = require('express');
const router = express.Router();
const { getDashboardSummary, getPublicLeaderboard } = require('../controllers/gamificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getDashboardSummary);
router.get('/leaderboard', getPublicLeaderboard);

module.exports = router;