const express = require('express');
const router = express.Router();
const { register, login, deleteAccount } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.delete('/account', requireAuth, deleteAccount);

module.exports = router;