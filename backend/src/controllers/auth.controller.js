const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../prisma/client');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Podaj login i hasło' });

    // Szukaj po login lub email (backwards compat)
    const user = await prisma.user.findFirst({
      where: { OR: [{ login }, { email: login }] },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }
    const token = generateToken(user.id);
    const { password: _, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) { next(err); }
};

exports.registerCouple = async (req, res, next) => {
  try {
    const { login, email, password, name, weddingDate, coordinatorId } = req.body;
    if (!login) return res.status(400).json({ error: 'Login jest wymagany' });

    const existingLogin = await prisma.user.findUnique({ where: { login } });
    if (existingLogin) return res.status(409).json({ error: 'Login już istnieje' });

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) return res.status(409).json({ error: 'Email już istnieje' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        login,
        email: email || null,
        password: hashed,
        name,
        role: 'couple',
        wedding: {
          create: {
            weddingDate: new Date(weddingDate),
            ...(coordinatorId && { coordinatorId }),
          },
        },
      },
      include: { wedding: true },
    });

    const { password: _, ...userSafe } = user;
    res.status(201).json(userSafe);
  } catch (err) { next(err); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { login } = req.body;
    const user = await prisma.user.findFirst({
      where: { OR: [{ login }, { email: login }] },
    });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.passwordReset.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) },
      });
      console.log(`[PASSWORD RESET] Token for ${login}: ${token}`);
    }
    res.json({ message: 'Jeśli konto istnieje, skontaktuj się z administratorem' });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token wygasł lub jest nieprawidłowy' });
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: hashed } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
    ]);
    res.json({ message: 'Hasło zostało zmienione' });
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json(userSafe);
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Aktualne hasło jest nieprawidłowe' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: 'Hasło zostało zmienione' });
  } catch (err) { next(err); }
};
