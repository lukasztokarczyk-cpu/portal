const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacyjnego' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'Użytkownik nie istnieje' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Brak uprawnień do tego zasobu' });
  }
  next();
};

module.exports = { authenticate, authorize };
