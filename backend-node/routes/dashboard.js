const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/gamificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, getDashboardSummary);

module.exports = router;
