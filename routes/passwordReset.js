const express = require('express');
const router = express.Router();
const { requestReset, confirmReset } = require('../controllers/passwordResetController');

router.post('/request', requestReset);
router.post('/confirm', confirmReset);

module.exports = router;