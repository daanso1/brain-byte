const express = require('express');
const router = express.Router();
const { verifyCode, resendCode } = require('../controllers/verifyController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, verifyCode);
router.post('/resend', requireAuth, resendCode);

module.exports = router;