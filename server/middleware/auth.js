const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yoko-ajans-dev-secret';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  });
}

function requireVipOrAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!['admin', 'vip'].includes(req.user.role)) {
      return res.status(403).json({ error: 'VIP or Admin required' });
    }
    next();
  });
}

module.exports = { signToken, verifyToken, requireAuth, requireAdmin, requireVipOrAdmin };
