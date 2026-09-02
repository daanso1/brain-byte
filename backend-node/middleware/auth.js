const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'brain-byte-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = decoded; // { id, email, name }
    next();
  });
}

module.exports = { requireAuth, JWT_SECRET };
