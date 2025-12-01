const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Требуется аутентификация' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

module.exports = { authenticateToken };